import "server-only";
import { asc, eq, sql, type SQL } from "drizzle-orm";
import { TAG_TO_LESSON } from "@content/problem-bank";
import { db } from "@/lib/db";
import { bankCompanies, bankProgress, bankSources, topics } from "@/lib/db/schema";
import type { BankFilters, BankStatus } from "@/lib/problem-bank/filters";
import type { BankWindow } from "@/lib/problem-bank/parse";
import { getCurrentUserId } from "./user";

export const BANK_PAGE_SIZE = 50;

export interface BankRow {
  id: number;
  slug: string;
  title: string;
  url: string;
  difficulty: "easy" | "medium" | "hard" | null;
  tags: string[];
  internalSlug: string | null;
  status: BankStatus | null;
  frequency: number | null;
  companyCount: number;
  patterns: { slug: string; name: string }[];
}

/** LeetCode tags that map to a lesson (inverse of TAG_TO_LESSON). */
export function tagsForLesson(lesson: string): string[] {
  return Object.entries(TAG_TO_LESSON)
    .filter(([, l]) => l === lesson)
    .map(([t]) => t);
}

const textArray = (xs: string[]) =>
  xs.length
    ? sql`array[${sql.join(
        xs.map((x) => sql`${x}`),
        sql`, `,
      )}]::text[]`
    : sql`array[]::text[]`;

export async function getBankOverview() {
  const [counts] = (await db.execute(
    sql`select (select count(*)::int from bank_problems) as problems, (select count(*)::int from bank_problem_companies) as entries`,
  )) as unknown as { problems: number; entries: number }[];
  const sources = await db.select().from(bankSources).orderBy(asc(bankSources.key));
  return { problems: counts?.problems ?? 0, entries: counts?.entries ?? 0, sources };
}

export async function listBankCompanyOptions() {
  const rows = (await db.execute(sql`
    select c.slug, c.name, t.slug as track_slug, count(pc.problem_id)::int as problems
    from bank_companies c
    left join companies t on t.id = c.company_id
    left join bank_problem_companies pc on pc.bank_company_id = c.id and pc.window = 'all'
    group by c.id, t.slug
    having count(pc.problem_id) > 0
    order by lower(c.name)`)) as unknown as {
    slug: string;
    name: string;
    track_slug: string | null;
    problems: number;
  }[];
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    tracked: r.track_slug !== null,
    problems: r.problems,
  }));
}

export async function listBankTags() {
  return (await db.execute(
    sql`select tag, count(*)::int as count from bank_problems, unnest(tags) as tag group by tag order by count desc, tag`,
  )) as unknown as { tag: string; count: number }[];
}

export async function listBankPatterns() {
  const userId = getCurrentUserId();
  const rows = (await db.execute(sql`
    select p.slug, p.name, p.position, p.topic_slug, p.source_url, t.title as topic_title,
      count(pp.problem_id)::int as total,
      count(pr.problem_id) filter (where pr.status in ('solved', 'solved_with_help'))::int as solved
    from bank_patterns p
    left join topics t on t.slug = p.topic_slug
    left join bank_problem_patterns pp on pp.pattern_id = p.id
    left join bank_progress pr on pr.problem_id = pp.problem_id and pr.user_id = ${userId}
    group by p.id, t.title
    order by p.position`)) as unknown as {
    slug: string;
    name: string;
    position: number;
    topic_slug: string | null;
    source_url: string;
    topic_title: string | null;
    total: number;
    solved: number;
  }[];
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    position: r.position,
    topicSlug: r.topic_slug,
    topicTitle: r.topic_title,
    sourceUrl: r.source_url,
    total: r.total,
    solved: r.solved,
  }));
}

function companyCount(window: BankWindow) {
  return sql`(select count(*)::int from bank_problem_companies x where x.problem_id = b.id and x.window = ${window})`;
}

const PATTERNS_JSON = sql`coalesce((select json_agg(json_build_object('slug', p.slug, 'name', p.name) order by p.position)
  from bank_problem_patterns pp join bank_patterns p on p.id = pp.pattern_id where pp.problem_id = b.id), '[]'::json)`;

type RawRow = {
  id: number;
  slug: string;
  title: string;
  url: string;
  difficulty: BankRow["difficulty"];
  tags: string[];
  internal_slug: string | null;
  status: BankStatus | null;
  frequency: number | null;
  company_count: number;
  patterns: { slug: string; name: string }[];
  total: number;
};

const toRow = (r: RawRow): BankRow => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  url: r.url,
  difficulty: r.difficulty,
  tags: r.tags,
  internalSlug: r.internal_slug,
  status: r.status,
  frequency: r.frequency,
  companyCount: r.company_count,
  patterns: r.patterns,
});

/** Filtered, sorted, paginated bank listing for the current user. */
export async function searchBank(
  f: BankFilters,
): Promise<{ rows: BankRow[]; total: number; companyName: string | null }> {
  const userId = getCurrentUserId();
  let company: { id: number; name: string } | null = null;
  if (f.company) {
    const [c] = await db
      .select({ id: bankCompanies.id, name: bankCompanies.name })
      .from(bankCompanies)
      .where(eq(bankCompanies.slug, f.company));
    if (!c) return { rows: [], total: 0, companyName: null };
    company = c;
  }

  const where: SQL[] = [];
  if (f.q) {
    const like = `%${f.q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
    where.push(sql`b.title ilike ${like}`);
  }
  if (f.difficulty) where.push(sql`b.difficulty = ${f.difficulty}`);
  if (f.tag) where.push(sql`b.tags @> ${textArray([f.tag])}`);
  if (f.pattern) {
    where.push(sql`exists (select 1 from bank_problem_patterns pp join bank_patterns p on p.id = pp.pattern_id
      where pp.problem_id = b.id and p.slug = ${f.pattern})`);
  }
  if (f.lesson) {
    where.push(sql`(b.tags && ${textArray(tagsForLesson(f.lesson))} or exists (select 1 from bank_problem_patterns pp
      join bank_patterns p on p.id = pp.pattern_id where pp.problem_id = b.id and p.topic_slug = ${f.lesson}))`);
  }
  if (f.status === "none") where.push(sql`pr.status is null`);
  else if (f.status) where.push(sql`pr.status = ${f.status}`);
  if (!company && f.window !== "all") {
    where.push(
      sql`exists (select 1 from bank_problem_companies x where x.problem_id = b.id and x.window = ${f.window})`,
    );
  }

  const order =
    f.sort === "title"
      ? sql`b.title asc`
      : f.sort === "difficulty"
        ? sql`case b.difficulty when 'easy' then 1 when 'medium' then 2 when 'hard' then 3 else 4 end, company_count desc, b.title`
        : company
          ? sql`fq.frequency desc, b.title`
          : sql`company_count desc, b.title`;

  const rows = (await db.execute(sql`
    select b.id, b.slug, b.title, b.url, b.difficulty, b.tags, cp.slug as internal_slug, pr.status,
      ${company ? sql`fq.frequency` : sql`null::real`} as frequency,
      ${companyCount(f.window)} as company_count,
      ${PATTERNS_JSON} as patterns,
      count(*) over ()::int as total
    from bank_problems b
    ${company ? sql`join bank_problem_companies fq on fq.problem_id = b.id and fq.bank_company_id = ${company.id} and fq.window = ${f.window}` : sql``}
    left join bank_progress pr on pr.problem_id = b.id and pr.user_id = ${userId}
    left join coding_problems cp on cp.id = b.internal_problem_id
    ${where.length ? sql`where ${sql.join(where, sql` and `)}` : sql``}
    order by ${order}
    limit ${BANK_PAGE_SIZE} offset ${(f.page - 1) * BANK_PAGE_SIZE}`)) as unknown as RawRow[];

  let total = rows[0]?.total ?? 0;
  if (rows.length === 0 && f.page > 1) total = -1; // page past the end; caller offers page 1
  return { rows: rows.map(toRow), total, companyName: company?.name ?? null };
}

export async function setBankStatus(problemId: number, status: BankStatus | null) {
  const userId = getCurrentUserId();
  if (status === null) {
    await db.execute(sql`delete from bank_progress where user_id = ${userId} and problem_id = ${problemId}`);
    return;
  }
  await db
    .insert(bankProgress)
    .values({ userId, problemId, status, solvedAt: status.startsWith("solved") ? new Date() : null })
    .onConflictDoUpdate({
      target: [bankProgress.userId, bankProgress.problemId],
      set: {
        status,
        updatedAt: sql`now()`,
        solvedAt: status.startsWith("solved") ? sql`coalesce(${bankProgress.solvedAt}, now())` : null,
      },
    });
}

/** Top problems for a lesson: tags mapped to the lesson, or patterns taught by it. */
export async function getLessonBankPractice(lesson: string, limit = 8) {
  const userId = getCurrentUserId();
  const rows = (await db.execute(sql`
    select b.id, b.slug, b.title, b.url, b.difficulty, b.tags, cp.slug as internal_slug, pr.status,
      null::real as frequency, ${companyCount("all")} as company_count, '[]'::json as patterns,
      count(*) over ()::int as total
    from bank_problems b
    left join bank_progress pr on pr.problem_id = b.id and pr.user_id = ${userId}
    left join coding_problems cp on cp.id = b.internal_problem_id
    where b.tags && ${textArray(tagsForLesson(lesson))}
      or exists (select 1 from bank_problem_patterns pp join bank_patterns p on p.id = pp.pattern_id
        where pp.problem_id = b.id and p.topic_slug = ${lesson})
    order by company_count desc, b.title
    limit ${limit}`)) as unknown as RawRow[];
  return { rows: rows.map(toRow), total: rows[0]?.total ?? 0 };
}

const WINDOW_FALLBACK: BankWindow[] = ["3m", "6m", "all"];
/** A recent period is only shown when it has at least this many problems; otherwise a longer one is used. */
const MIN_WINDOW_PROBLEMS = 5;

/** Top reported problems for an InterviewOS company track, if the dataset has its list. */
export async function getCompanyBankSummary(companyId: number, limit = 10) {
  const linked = await db
    .select({ id: bankCompanies.id, slug: bankCompanies.slug, name: bankCompanies.name })
    .from(bankCompanies)
    .where(eq(bankCompanies.companyId, companyId))
    .orderBy(asc(bankCompanies.name));
  const primary = linked[0];
  if (!primary) return null;
  const userId = getCurrentUserId();
  const counts = (await db.execute(sql`
    select "window", count(*)::int as n from bank_problem_companies where bank_company_id = ${primary.id} group by "window"`)) as unknown as {
    window: BankWindow;
    n: number;
  }[];
  const count = (w: BankWindow) => counts.find((c) => c.window === w)?.n ?? 0;
  const preferred =
    WINDOW_FALLBACK.find((w) => count(w) >= MIN_WINDOW_PROBLEMS) ?? WINDOW_FALLBACK.find((w) => count(w) > 0);
  for (const window of preferred ? [preferred] : []) {
    const rows = (await db.execute(sql`
      select b.id, b.slug, b.title, b.url, b.difficulty, b.tags, cp.slug as internal_slug, pr.status,
        fq.frequency, 0 as company_count, '[]'::json as patterns, count(*) over ()::int as total
      from bank_problem_companies fq
      join bank_problems b on b.id = fq.problem_id
      left join bank_progress pr on pr.problem_id = b.id and pr.user_id = ${userId}
      left join coding_problems cp on cp.id = b.internal_problem_id
      where fq.bank_company_id = ${primary.id} and fq.window = ${window}
      order by fq.frequency desc, b.title
      limit ${limit}`)) as unknown as RawRow[];
    if (rows.length === 0) continue;
    const [solved] = (await db.execute(sql`
      select count(*)::int as n from bank_problem_companies fq
      join bank_progress pr on pr.problem_id = fq.problem_id and pr.user_id = ${userId}
      where fq.bank_company_id = ${primary.id} and fq.window = ${window} and pr.status in ('solved', 'solved_with_help')`)) as unknown as {
      n: number;
    }[];
    return {
      companySlug: primary.slug,
      companyName: primary.name,
      window,
      rows: rows.map(toRow),
      total: rows[0]!.total,
      solved: solved?.n ?? 0,
    };
  }
  return {
    companySlug: primary.slug,
    companyName: primary.name,
    window: "all" as BankWindow,
    rows: [],
    total: 0,
    solved: 0,
  };
}

export async function lessonTitles() {
  const rows = await db.select({ slug: topics.slug, title: topics.title }).from(topics);
  return new Map(rows.map((r) => [r.slug, r.title]));
}
