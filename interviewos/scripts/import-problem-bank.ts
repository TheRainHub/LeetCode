/**
 * Imports the problem bank from external open datasets into PostgreSQL.
 *
 *   npm run bank:import                         # clone/pull sources into .data-sources/, then import
 *   npm run bank:import -- --no-fetch           # use existing copies only
 *   npm run bank:import -- --sources <dir>      # read clones from another directory
 *
 * The datasets are not committed to this repository; they are fetched from
 * their GitHub repositories (see content/problem-bank.ts). Only metadata is
 * stored — titles, links, difficulty, tags, company frequencies and pattern
 * membership — never problem statements. User progress is never modified.
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { inArray, isNotNull, notInArray, sql as dsql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { BANK_SOURCES, COMPANY_DATASET_NAMES, PATTERN_TO_LESSON } from "../content/problem-bank";
import * as s from "../src/lib/db/schema";
import {
  emptyModel,
  readCompanyLists,
  readPatterns,
  type BankModel,
} from "../src/lib/problem-bank/read-sources";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const sourcesDir = resolve(option("--sources") ?? ".data-sources");
const fetch = !flag("--no-fetch");

const url = process.env.DATABASE_URL ?? "postgres://interviewos:interviewos@localhost:5432/interviewos";
const sql = postgres(url, { max: 1, onnotice: () => {} });
const db = drizzle(sql, { schema: s });

const git = (cwd: string, ...a: string[]) =>
  execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function prepareSource(
  repoUrl: string,
  dir: string,
): { ok: boolean; commit: string | null; commitDate: Date | null } {
  if (!existsSync(dir)) {
    if (!fetch) {
      console.warn(`[bank] ${dir} not found and --no-fetch given; skipping this source.`);
      return { ok: false, commit: null, commitDate: null };
    }
    mkdirSync(sourcesDir, { recursive: true });
    console.log(`[bank] cloning ${repoUrl} …`);
    execFileSync("git", ["clone", "--depth", "1", repoUrl, dir], { stdio: "inherit" });
  } else if (fetch && existsSync(join(dir, ".git"))) {
    try {
      git(dir, "pull", "--ff-only", "--quiet");
    } catch (err) {
      console.warn(
        `[bank] could not update ${dir} (${(err as Error).message.split("\n")[0]}); using the existing copy.`,
      );
    }
  }
  if (!existsSync(join(dir, ".git"))) return { ok: true, commit: null, commitDate: null };
  const [commit, date] = git(dir, "log", "-1", "--format=%H%n%cI").split("\n");
  return { ok: true, commit: commit ?? null, commitDate: date ? new Date(date) : null };
}

const chunk = <T>(xs: T[], n: number) =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

async function write(
  model: BankModel,
  read: { companies: boolean; patterns: boolean },
  meta: Map<string, { commit: string | null; commitDate: Date | null }>,
) {
  const patternsSource = BANK_SOURCES.find((x) => x.key === "coding-patterns")!;
  await db.transaction(async (tx) => {
    // Problems: full metadata from company lists; pattern-only problems never overwrite known titles.
    const all = [...model.problems.values()];
    const known = all.filter((p) => p.difficulty !== null);
    const guessed = all.filter((p) => p.difficulty === null);
    for (const batch of chunk(known, 1000)) {
      await tx
        .insert(s.bankProblems)
        .values(
          batch.map((p) => ({
            slug: p.slug,
            title: p.title,
            url: p.url,
            difficulty: p.difficulty,
            tags: p.tags,
          })),
        )
        .onConflictDoUpdate({
          target: s.bankProblems.slug,
          set: {
            title: dsql`excluded.title`,
            url: dsql`excluded.url`,
            difficulty: dsql`excluded.difficulty`,
            tags: dsql`case when cardinality(excluded.tags) > 0 then excluded.tags else ${s.bankProblems.tags} end`,
            updatedAt: dsql`now()`,
          },
        });
    }
    for (const batch of chunk(guessed, 1000)) {
      await tx
        .insert(s.bankProblems)
        .values(batch.map((p) => ({ slug: p.slug, title: p.title, url: p.url, difficulty: null, tags: [] })))
        .onConflictDoNothing({ target: s.bankProblems.slug });
    }
    const idRows = await tx.select({ id: s.bankProblems.id, slug: s.bankProblems.slug }).from(s.bankProblems);
    const problemId = new Map(idRows.map((r) => [r.slug, r.id]));

    if (read.companies) {
      for (const batch of chunk(model.companies, 500)) {
        await tx
          .insert(s.bankCompanies)
          .values(batch.map((c) => ({ slug: c.slug, name: c.name })))
          .onConflictDoUpdate({ target: s.bankCompanies.slug, set: { name: dsql`excluded.name` } });
      }
      const companyRows = await tx
        .select({ id: s.bankCompanies.id, slug: s.bankCompanies.slug, name: s.bankCompanies.name })
        .from(s.bankCompanies);
      const companyId = new Map(companyRows.map((r) => [r.slug, r.id]));

      // Frequencies are replaced wholesale: they describe the dataset snapshot, not user data.
      await tx.delete(s.bankProblemCompanies);
      const entries = model.companies.flatMap((c) =>
        c.entries.map((e) => ({
          problemId: problemId.get(e.slug)!,
          bankCompanyId: companyId.get(c.slug)!,
          window: e.window,
          frequency: e.frequency,
        })),
      );
      for (const batch of chunk(entries, 5000)) await tx.insert(s.bankProblemCompanies).values(batch);

      // Link dataset companies to InterviewOS company tracks.
      await tx.update(s.bankCompanies).set({ companyId: null }).where(isNotNull(s.bankCompanies.companyId));
      const tracks = await tx.select({ id: s.companies.id, slug: s.companies.slug }).from(s.companies);
      for (const t of tracks) {
        const names = COMPANY_DATASET_NAMES[t.slug];
        if (names?.length)
          await tx
            .update(s.bankCompanies)
            .set({ companyId: t.id })
            .where(inArray(s.bankCompanies.name, names));
      }
    }

    if (read.patterns) {
      const topicRows = await tx.select({ slug: s.topics.slug }).from(s.topics);
      const topicSlugs = new Set(topicRows.map((t) => t.slug));
      for (const p of model.patterns) {
        const lesson = PATTERN_TO_LESSON[p.position] ?? null;
        const values = {
          slug: p.slug,
          name: p.name,
          position: p.position,
          topicSlug: lesson && topicSlugs.has(lesson) ? lesson : null,
          sourceUrl: `${patternsSource.repoUrl}/blob/HEAD/${encodeURIComponent(p.fileName)}`,
        };
        await tx
          .insert(s.bankPatterns)
          .values(values)
          .onConflictDoUpdate({ target: s.bankPatterns.slug, set: values });
      }
      const keep = model.patterns.map((p) => p.slug);
      if (keep.length) await tx.delete(s.bankPatterns).where(notInArray(s.bankPatterns.slug, keep));
      const patternRows = await tx
        .select({ id: s.bankPatterns.id, slug: s.bankPatterns.slug })
        .from(s.bankPatterns);
      const patternId = new Map(patternRows.map((r) => [r.slug, r.id]));
      await tx.delete(s.bankProblemPatterns);
      const links = model.patterns.flatMap((p) =>
        p.problems.map((slug) => ({ problemId: problemId.get(slug)!, patternId: patternId.get(p.slug)! })),
      );
      for (const batch of chunk(links, 5000))
        if (batch.length) await tx.insert(s.bankProblemPatterns).values(batch).onConflictDoNothing();
    }

    // Problems InterviewOS can execute itself (same LeetCode slug).
    await tx.execute(
      dsql`update bank_problems b set internal_problem_id = c.id from coding_problems c where c.slug = b.slug`,
    );
    await tx.execute(
      dsql`update bank_problems b set internal_problem_id = null where not exists (select 1 from coding_problems c where c.slug = b.slug)`,
    );

    const now = new Date();
    for (const src of BANK_SOURCES) {
      const m = meta.get(src.key);
      if (!m) continue;
      const stats: Record<string, number> =
        src.key === "company-lists"
          ? {
              companies: model.companies.length,
              entries: model.companies.reduce((n, c) => n + c.entries.length, 0),
              skippedRows: model.skippedRows,
            }
          : {
              patterns: model.patterns.length,
              links: model.patterns.reduce((n, p) => n + p.problems.length, 0),
            };
      const values = {
        key: src.key,
        repoUrl: src.repoUrl,
        commit: m.commit,
        commitDate: m.commitDate,
        importedAt: now,
        stats,
      };
      await tx
        .insert(s.bankSources)
        .values(values)
        .onConflictDoUpdate({ target: s.bankSources.key, set: values });
    }
  });
}

async function main() {
  const model = emptyModel();
  const read = { companies: false, patterns: false };
  const meta = new Map<string, { commit: string | null; commitDate: Date | null }>();
  for (const src of BANK_SOURCES) {
    const dir = join(sourcesDir, src.dir);
    const prepared = prepareSource(src.repoUrl, dir);
    if (!prepared.ok) continue;
    if (src.key === "company-lists") {
      readCompanyLists(dir, model);
      read.companies = true;
    } else {
      readPatterns(dir, model);
      read.patterns = true;
    }
    meta.set(src.key, { commit: prepared.commit, commitDate: prepared.commitDate });
  }
  if (!read.companies && !read.patterns) throw new Error(`No sources found in ${sourcesDir}.`);
  await write(model, read, meta);
  const entries = model.companies.reduce((n, c) => n + c.entries.length, 0);
  console.log(
    `[bank] ${model.problems.size} problems · ${model.companies.length} companies · ${entries} company/window entries · ${model.patterns.length} patterns`,
  );
  if (model.skippedRows) console.log(`[bank] skipped ${model.skippedRows} malformed row(s)`);
  for (const w of model.warnings.slice(0, 10)) console.log(`[bank] warning: ${w}`);
}

main()
  .catch((err) => {
    console.error("[bank] import failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
