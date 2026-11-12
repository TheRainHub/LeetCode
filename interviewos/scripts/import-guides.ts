/**
 * Imports ByteByteGo's System Design 101 guides (CC BY-NC-ND 4.0) for local reading.
 *
 *   npm run guides:import                     # clone/pull into .data-sources/, then import
 *   npm run guides:import -- --no-fetch       # use the existing copy only
 *   npm run guides:import -- --sources <dir>  # read a clone from another directory
 *
 * Guides are stored unchanged and always shown with attribution and the license.
 * Nothing from the source is committed to this repository. Read marks are kept
 * for guides that still exist.
 */
import "dotenv/config";
import { join, resolve } from "node:path";
import { notInArray, sql as dsql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GUIDES_FOR_LESSON, GUIDES_FOR_QUESTION, GUIDES_SOURCE } from "../content/guides";
import * as s from "../src/lib/db/schema";
import { directDatabaseUrl, usesTransactionPooler } from "../src/lib/db/url";
import { readGuides } from "../src/lib/guides/read";
import { prepareGitSource } from "./lib/git-source";

const args = process.argv.slice(2);
const option = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const fetch = !args.includes("--no-fetch");
const dir = join(resolve(option("--sources") ?? ".data-sources"), GUIDES_SOURCE.dir);

const url = directDatabaseUrl();
const sql = postgres(url, { max: 1, prepare: !usesTransactionPooler(url), onnotice: () => {} });
const db = drizzle(sql, { schema: s });

async function main() {
  const prepared = prepareGitSource(GUIDES_SOURCE.repoUrl, dir, { fetch, label: "guides" });
  if (!prepared.ok) throw new Error(`No guides found at ${dir}.`);
  const { guides, categories, warnings } = readGuides(dir);
  const seen = new Set<string>();
  const unique = guides.filter((g) => !seen.has(g.slug) && seen.add(g.slug));

  await db.transaction(async (tx) => {
    for (const c of categories) {
      await tx
        .insert(s.guideCategories)
        .values(c)
        .onConflictDoUpdate({ target: s.guideCategories.slug, set: c });
    }
    for (let i = 0; i < unique.length; i += 200) {
      const batch = unique.slice(i, i + 200);
      await tx
        .insert(s.guides)
        .values(batch)
        .onConflictDoUpdate({
          target: s.guides.slug,
          set: {
            path: dsql`excluded.path`,
            title: dsql`excluded.title`,
            description: dsql`excluded.description`,
            imageUrl: dsql`excluded.image_url`,
            publishedOn: dsql`excluded.published_on`,
            categories: dsql`excluded.categories`,
            tags: dsql`excluded.tags`,
            content: dsql`excluded.content`,
            updatedAt: dsql`now()`,
          },
        });
    }
    if (unique.length)
      await tx.delete(s.guides).where(
        notInArray(
          s.guides.slug,
          unique.map((g) => g.slug),
        ),
      );
    const values = {
      key: GUIDES_SOURCE.key,
      repoUrl: GUIDES_SOURCE.repoUrl,
      commit: prepared.commit,
      commitDate: prepared.commitDate,
      importedAt: new Date(),
      stats: { guides: unique.length, categories: categories.length },
    };
    await tx
      .insert(s.bankSources)
      .values(values)
      .onConflictDoUpdate({ target: s.bankSources.key, set: values });
  });

  console.log(`[guides] ${unique.length} guides · ${categories.length} categories`);
  const mapped = [...Object.values(GUIDES_FOR_LESSON), ...Object.values(GUIDES_FOR_QUESTION)].flat();
  const missing = [...new Set(mapped.filter((m) => !seen.has(m)))];
  if (missing.length)
    console.log(`[guides] ${missing.length} mapped guide(s) not in this copy: ${missing.join(", ")}`);
  for (const w of warnings.slice(0, 10)) console.log(`[guides] skipped ${w}`);
}

main()
  .catch((err) => {
    console.error("[guides] import failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
