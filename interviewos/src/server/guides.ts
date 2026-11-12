import "server-only";
import { and, eq, sql, type SQL } from "drizzle-orm";
import { GUIDES_FOR_LESSON, GUIDES_FOR_QUESTION, GUIDES_SOURCE } from "@content/guides";
import { db } from "@/lib/db";
import { bankSources, guideReads, guides } from "@/lib/db/schema";
import { getCurrentUserId } from "./user";

export const GUIDES_PAGE_SIZE = 24;

export interface GuideCard {
  id: number;
  slug: string;
  title: string;
  description: string;
  imageUrl: string | null;
  publishedOn: string | null;
  categories: string[];
  read: boolean;
}

export interface GuideFilters {
  q: string;
  category: string | null;
  read: "read" | "unread" | null;
  page: number;
}

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export function parseGuideFilters(sp: Params): GuideFilters {
  const page = Number(first(sp.page));
  const category = first(sp.category);
  const read = first(sp.read);
  return {
    q: (first(sp.q) ?? "").slice(0, 100),
    category: category && /^[a-z0-9-]{1,80}$/.test(category) ? category : null,
    read: read === "read" || read === "unread" ? read : null,
    page: Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1,
  };
}

export function guidesHref(f: GuideFilters, patch: Partial<GuideFilters> = {}): string {
  const m = { ...f, page: 1, ...patch };
  const q = new URLSearchParams();
  if (m.q) q.set("q", m.q);
  if (m.category) q.set("category", m.category);
  if (m.read) q.set("read", m.read);
  if (m.page > 1) q.set("page", String(m.page));
  const s = q.toString();
  return s ? `/practice/system-design/guides?${s}` : "/practice/system-design/guides";
}

const cardColumns = (userId: number) => ({
  id: guides.id,
  slug: guides.slug,
  title: guides.title,
  description: guides.description,
  imageUrl: guides.imageUrl,
  publishedOn: guides.publishedOn,
  categories: guides.categories,
  read: sql<boolean>`exists (select 1 from guide_reads r where r.guide_id = ${guides.id} and r.user_id = ${userId})`,
});

export async function getGuidesOverview() {
  const userId = getCurrentUserId();
  const [counts] = (await db.execute(sql`
    select (select count(*)::int from guides) as total,
           (select count(*)::int from guide_reads where user_id = ${userId}) as read`)) as unknown as {
    total: number;
    read: number;
  }[];
  const [source] = await db.select().from(bankSources).where(eq(bankSources.key, GUIDES_SOURCE.key));
  return { total: counts?.total ?? 0, read: counts?.read ?? 0, source: source ?? null };
}

export async function listGuideCategories() {
  const userId = getCurrentUserId();
  return (await db.execute(sql`
    select c.slug, c.title, c.sort, count(g.id)::int as total,
      count(r.guide_id)::int as read
    from guide_categories c
    left join guides g on c.slug = any(g.categories)
    left join guide_reads r on r.guide_id = g.id and r.user_id = ${userId}
    group by c.slug, c.title, c.sort
    having count(g.id) > 0
    order by c.sort, c.title`)) as unknown as {
    slug: string;
    title: string;
    sort: number;
    total: number;
    read: number;
  }[];
}

export async function searchGuides(f: GuideFilters): Promise<{ rows: GuideCard[]; total: number }> {
  const userId = getCurrentUserId();
  const where: SQL[] = [];
  if (f.q) {
    const like = `%${f.q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
    where.push(
      sql`(${guides.title} ilike ${like} or ${guides.description} ilike ${like} or exists (select 1 from unnest(${guides.tags}) t where t ilike ${like}))`,
    );
  }
  if (f.category) where.push(sql`${f.category} = any(${guides.categories})`);
  const readExists = sql`exists (select 1 from guide_reads r where r.guide_id = ${guides.id} and r.user_id = ${userId})`;
  if (f.read === "read") where.push(readExists);
  if (f.read === "unread") where.push(sql`not ${readExists}`);
  const condition = where.length ? and(...where) : undefined;
  const [rows, [count]] = await Promise.all([
    db
      .select(cardColumns(userId))
      .from(guides)
      .where(condition)
      .orderBy(sql`${guides.publishedOn} desc nulls last`, guides.title)
      .limit(GUIDES_PAGE_SIZE)
      .offset((f.page - 1) * GUIDES_PAGE_SIZE),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(guides)
      .where(condition),
  ]);
  return { rows, total: count?.n ?? 0 };
}

/** Cards for curated slugs, in the given order; slugs missing from the import are skipped. */
export async function getGuidesBySlugs(slugs: string[]): Promise<GuideCard[]> {
  if (!slugs.length) return [];
  const userId = getCurrentUserId();
  const rows = await db
    .select(cardColumns(userId))
    .from(guides)
    .where(
      sql`${guides.slug} in (${sql.join(
        slugs.map((s) => sql`${s}`),
        sql`, `,
      )})`,
    );
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return slugs.map((s) => bySlug.get(s)).filter((r): r is GuideCard => Boolean(r));
}

export async function getGuide(slug: string) {
  const userId = getCurrentUserId();
  const [g] = await db
    .select({
      ...cardColumns(userId),
      path: guides.path,
      tags: guides.tags,
      content: guides.content,
    })
    .from(guides)
    .where(eq(guides.slug, slug));
  if (!g) return null;
  const lessons = Object.entries(GUIDES_FOR_LESSON)
    .filter(([, list]) => list.includes(slug))
    .map(([lesson]) => lesson);
  const questions = Object.entries(GUIDES_FOR_QUESTION)
    .filter(([, list]) => list.includes(slug))
    .map(([q]) => q);
  return { ...g, lessons, questions };
}

export async function setGuideRead(slug: string, read: boolean) {
  const userId = getCurrentUserId();
  const [g] = await db.select({ id: guides.id }).from(guides).where(eq(guides.slug, slug));
  if (!g) throw new Error("Guide not found");
  if (read) await db.insert(guideReads).values({ userId, guideId: g.id }).onConflictDoNothing();
  else await db.delete(guideReads).where(and(eq(guideReads.userId, userId), eq(guideReads.guideId, g.id)));
}
