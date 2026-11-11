/**
 * Idempotent seed. Safe to run repeatedly:
 *  - content tables (paths, lessons, problems, labs, companies) are upserted by slug;
 *  - user-owned data (progress, notes, edited tracks, checklists, projects) is
 *    created only when missing and never overwritten.
 *
 * Usage: npm run db:seed
 */
import "dotenv/config";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { directDatabaseUrl, usesTransactionPooler } from "../src/lib/db/url";
import { COMPANIES } from "../content/companies";
import { CURRICULUM } from "../content/curriculum";
import { LABS } from "../content/labs";
import { PROBLEMS } from "../content/problems";
import { DEFAULT_INTERVIEWER_PROFILE, PROJECTS } from "../content/projects";
import { starterCode } from "../src/lib/code-runner/starter";
import { parseLesson, type ParsedLesson } from "../src/lib/content/lesson-parser";
import { LANGUAGES, type Language } from "../src/lib/content/types";
import * as s from "../src/lib/db/schema";

const url = directDatabaseUrl();
const sql = postgres(url, { max: 1, prepare: !usesTransactionPooler(url), onnotice: () => {} });
const db = drizzle(sql, { schema: s });
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const LOCAL_USER_ID = 1;
const LESSONS_DIR = join(process.cwd(), "content", "lessons");

function listMarkdown(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return listMarkdown(full);
    return name.endsWith(".md") ? [full] : [];
  });
}

const warnings: string[] = [];

async function seedUser(tx: Tx) {
  const existing = await tx.select().from(s.users).where(eq(s.users.id, LOCAL_USER_ID));
  if (existing.length === 0) {
    await tx.insert(s.users).overridingSystemValue().values({ id: LOCAL_USER_ID, name: "Local user" });
  }
  await tx
    .insert(s.userSettings)
    .values({
      userId: LOCAL_USER_ID,
      interviewerProfile: DEFAULT_INTERVIEWER_PROFILE,
      timezone: process.env.APP_TIMEZONE ?? "Europe/Prague",
    })
    .onConflictDoNothing();
}

async function seedCurriculum(tx: Tx, lessons: ParsedLesson[]) {
  const moduleIds = new Map<string, number>();
  const pathArea = new Map<string, string>();
  for (const [pi, path] of CURRICULUM.entries()) {
    const [p] = await tx
      .insert(s.learningPaths)
      .values({
        slug: path.slug,
        title: path.title,
        area: path.area,
        description: path.description,
        order: pi,
      })
      .onConflictDoUpdate({
        target: s.learningPaths.slug,
        set: { title: path.title, area: path.area, description: path.description, order: pi },
      })
      .returning({ id: s.learningPaths.id });
    pathArea.set(path.slug, path.area);
    for (const [mi, mod] of path.modules.entries()) {
      const [m] = await tx
        .insert(s.modules)
        .values({ pathId: p!.id, slug: mod.slug, title: mod.title, description: mod.description, order: mi })
        .onConflictDoUpdate({
          target: s.modules.slug,
          set: { pathId: p!.id, title: mod.title, description: mod.description, order: mi },
        })
        .returning({ id: s.modules.id });
      moduleIds.set(mod.slug, m!.id);
    }
  }

  const lessonIds = new Map<string, number>();
  const topicIds = new Map<string, number>();
  for (const l of lessons) {
    const moduleId = moduleIds.get(l.module);
    if (!moduleId) throw new Error(`Lesson ${l.slug} references unknown module "${l.module}"`);
    const area = pathArea.get(l.path);
    if (!area) throw new Error(`Lesson ${l.slug} references unknown path "${l.path}"`);

    const [topic] = await tx
      .insert(s.topics)
      .values({ slug: l.slug, title: l.title, area, summary: l.summary, practiceKind: l.practice })
      .onConflictDoUpdate({
        target: s.topics.slug,
        set: { title: l.title, area, summary: l.summary, practiceKind: l.practice },
      })
      .returning({ id: s.topics.id });
    topicIds.set(l.slug, topic!.id);

    const values = {
      moduleId,
      topicId: topic!.id,
      slug: l.slug,
      title: l.title,
      order: l.order,
      estimatedMinutes: l.minutes,
      depth: l.depth,
      objectives: l.objectives,
      explanation: l.sections.Explanation,
      workedExamples: l.sections["Worked examples"],
      misconceptions: l.sections["Common misconceptions"],
      practicalExercises: l.sections["Practical exercises"],
      interviewQuestions: l.interview,
      selfAssessment: l.selfAssessment,
      completionCriteria: l.completion,
      readings: l.readings.map((r) => ({ title: r.title, url: r.url, kind: r.kind, note: r.note })),
      searchText: [l.title, l.summary, ...l.objectives, l.sections.Explanation].join("\n").toLowerCase(),
      updatedAt: new Date(),
    };
    const [lesson] = await tx
      .insert(s.lessons)
      .values(values)
      .onConflictDoUpdate({ target: s.lessons.slug, set: values })
      .returning({ id: s.lessons.id });
    lessonIds.set(l.slug, lesson!.id);

    const exerciseRows = [
      ...l.quiz.map((q, i) => ({
        lessonId: lesson!.id,
        slug: `${l.slug}:q${i + 1}`,
        kind: "mcq" as const,
        order: i,
        prompt: q.q,
        options: q.options,
        correctOption: q.answer,
        explanation: q.why,
        rubric: null,
        modelAnswer: null,
      })),
      {
        lessonId: lesson!.id,
        slug: `${l.slug}:explain`,
        kind: "explain" as const,
        order: 100,
        prompt: l.explain.prompt,
        options: null,
        correctOption: null,
        explanation: null,
        rubric: l.explain.rubric,
        modelAnswer: l.explain.model,
      },
    ];
    for (const ex of exerciseRows) {
      await tx.insert(s.exercises).values(ex).onConflictDoUpdate({ target: s.exercises.slug, set: ex });
    }
    await tx.delete(s.exercises).where(
      and(
        eq(s.exercises.lessonId, lesson!.id),
        notInArray(
          s.exercises.slug,
          exerciseRows.map((e) => e.slug),
        ),
      ),
    );

    // Review cards for the local user (scheduled only once the lesson is started).
    for (const [i, card] of l.cards.entries()) {
      await tx
        .insert(s.reviewCards)
        .values({
          userId: LOCAL_USER_ID,
          topicId: topic!.id,
          prompt: card.q,
          answer: card.a,
          source: "lesson",
          sourceRef: `lesson:${l.slug}:${i}`,
        })
        .onConflictDoUpdate({
          target: [s.reviewCards.userId, s.reviewCards.sourceRef],
          set: { prompt: card.q, answer: card.a, topicId: topic!.id },
        });
    }
  }

  // Prerequisites (rebuilt from content each time).
  await tx.delete(s.lessonPrerequisites);
  for (const l of lessons) {
    for (const pre of l.prerequisites) {
      const preId = lessonIds.get(pre);
      if (!preId) {
        warnings.push(`lesson ${l.slug}: prerequisite "${pre}" not found`);
        continue;
      }
      await tx
        .insert(s.lessonPrerequisites)
        .values({ lessonId: lessonIds.get(l.slug)!, prerequisiteId: preId });
    }
  }
  return { lessonIds, topicIds };
}

async function seedProblems(
  tx: Tx,
  topicIds: Map<string, number>,
  lessons: ParsedLesson[],
  lessonIds: Map<string, number>,
) {
  const problemIds = new Map<string, number>();
  for (const p of PROBLEMS) {
    const starter = Object.fromEntries(
      LANGUAGES.map((lang) => [lang, p.starterCode?.[lang] ?? starterCode(lang, p.signature)]),
    ) as Record<Language, string>;
    const values = {
      slug: p.slug,
      title: p.title,
      difficulty: p.difficulty,
      order: p.order,
      pattern: p.pattern,
      summary: p.summary,
      statement: p.statement,
      constraints: p.constraints,
      examples: p.examples,
      hints: p.hints,
      approach: p.approach,
      solutionCode: p.solutions,
      edgeCases: p.edgeCases,
      expectedTime: p.expectedTime,
      expectedSpace: p.expectedSpace,
      complexityNotes: p.complexityNotes,
      commonMistakes: p.commonMistakes,
      signature: p.signature,
      comparator: p.comparator,
      starterCode: starter,
      tests: p.tests,
      externalLinks: p.externalLinks,
    };
    const [row] = await tx
      .insert(s.codingProblems)
      .values(values)
      .onConflictDoUpdate({ target: s.codingProblems.slug, set: values })
      .returning({ id: s.codingProblems.id });
    problemIds.set(p.slug, row!.id);
    await tx.delete(s.problemTags).where(eq(s.problemTags.problemId, row!.id));
    if (p.tags.length)
      await tx.insert(s.problemTags).values(p.tags.map((tag) => ({ problemId: row!.id, tag })));
    await tx.delete(s.problemTopics).where(eq(s.problemTopics.problemId, row!.id));
    for (const t of p.topics) {
      const topicId = topicIds.get(t);
      if (!topicId) warnings.push(`problem ${p.slug}: topic "${t}" has no lesson yet`);
      else await tx.insert(s.problemTopics).values({ problemId: row!.id, topicId });
    }
  }
  await tx.delete(s.lessonProblems);
  for (const l of lessons) {
    for (const slug of l.problems) {
      const problemId = problemIds.get(slug);
      if (!problemId) warnings.push(`lesson ${l.slug}: problem "${slug}" not found`);
      else await tx.insert(s.lessonProblems).values({ lessonId: lessonIds.get(l.slug)!, problemId });
    }
  }
  return problemIds;
}

async function seedLabs(tx: Tx, topicIds: Map<string, number>) {
  for (const lab of LABS) {
    const values = {
      slug: lab.slug,
      title: lab.title,
      area: lab.area,
      order: lab.order,
      summary: lab.summary,
      estimatedMinutes: lab.estimatedMinutes,
      difficulty: lab.difficulty,
      objectives: lab.objectives,
      prerequisites: lab.prerequisites,
      tools: lab.tools,
      deliverables: lab.deliverables,
      steps: lab.steps,
      failureScenarios: lab.failureScenarios,
      reflectionQuestions: lab.reflectionQuestions,
    };
    const [row] = await tx
      .insert(s.practicalLabs)
      .values(values)
      .onConflictDoUpdate({ target: s.practicalLabs.slug, set: values })
      .returning({ id: s.practicalLabs.id });
    await tx.delete(s.labTopics).where(eq(s.labTopics.labId, row!.id));
    for (const t of lab.topics) {
      const topicId = topicIds.get(t);
      if (!topicId) warnings.push(`lab ${lab.slug}: topic "${t}" has no lesson yet`);
      else await tx.insert(s.labTopics).values({ labId: row!.id, topicId });
    }
  }
}

async function seedCompanies(tx: Tx, topicIds: Map<string, number>, problemIds: Map<string, number>) {
  for (const c of COMPANIES) {
    const values = {
      slug: c.slug,
      name: c.name,
      role: c.role,
      order: c.order,
      overview: c.overview,
      techStack: c.techStack,
      prepNotes: c.prepNotes,
      sourceNote: c.sourceNote,
    };
    const existing = await tx
      .select({ id: s.companies.id })
      .from(s.companies)
      .where(eq(s.companies.slug, c.slug));
    let companyId: number;
    if (existing[0]) {
      companyId = existing[0].id;
      // Name/role/overview are editable by the user; keep their edits.
    } else {
      const [row] = await tx.insert(s.companies).values(values).returning({ id: s.companies.id });
      companyId = row!.id;
    }

    // Focus topics are user-editable. Seeded topics are inserted once; a topic the user
    // removed is kept with weight 0 (excluded), so re-seeding never re-adds it.
    for (const [slug, weight] of Object.entries(c.focus)) {
      const topicId = topicIds.get(slug);
      if (!topicId) {
        warnings.push(`company ${c.slug}: focus topic "${slug}" has no lesson yet`);
        continue;
      }
      await tx.insert(s.companyFocusTopics).values({ companyId, topicId, weight }).onConflictDoNothing();
    }

    await tx.delete(s.companyProblems).where(eq(s.companyProblems.companyId, companyId));
    for (const slug of c.problems) {
      const problemId = problemIds.get(slug);
      if (problemId) await tx.insert(s.companyProblems).values({ companyId, problemId });
    }

    await tx.delete(s.interviewPresets).where(eq(s.interviewPresets.companyId, companyId));
    await tx.insert(s.interviewPresets).values(c.presets.map((p, i) => ({ ...p, companyId, order: i })));

    const items = await tx
      .select({ id: s.companyChecklistItems.id })
      .from(s.companyChecklistItems)
      .where(
        and(
          eq(s.companyChecklistItems.companyId, companyId),
          eq(s.companyChecklistItems.userId, LOCAL_USER_ID),
        ),
      );
    if (items.length === 0) {
      await tx
        .insert(s.companyChecklistItems)
        .values(c.checklist.map((text, i) => ({ userId: LOCAL_USER_ID, companyId, text, order: i })));
    }
  }
}

async function seedProjects(tx: Tx) {
  const existing = await tx
    .select({ slug: s.personalProjects.slug })
    .from(s.personalProjects)
    .where(eq(s.personalProjects.userId, LOCAL_USER_ID));
  const have = new Set(existing.map((p) => p.slug));
  for (const p of PROJECTS) {
    if (have.has(p.slug)) continue;
    await tx.insert(s.personalProjects).values({ ...p, userId: LOCAL_USER_ID, needsReview: true });
  }
}

async function seedCalendar(tx: Tx) {
  // A real constraint the user told us about. Created once; the user can edit or delete it.
  const title = "ZWA test (CSS/JavaScript)";
  const found = await tx
    .select({ id: s.calendarEvents.id })
    .from(s.calendarEvents)
    .where(and(eq(s.calendarEvents.userId, LOCAL_USER_ID), eq(s.calendarEvents.title, title)));
  if (found.length === 0) {
    await tx.insert(s.calendarEvents).values({
      userId: LOCAL_USER_ID,
      kind: "university",
      title,
      date: "2026-11-11",
      lightDaysBefore: 3,
      notes: "University obligation — interview prep stays lightweight before and on this day.",
    });
  }
}

async function main() {
  const files = listMarkdown(LESSONS_DIR);
  const lessons = files.map((f) => parseLesson(readFileSync(f, "utf8"), relative(process.cwd(), f)));
  const dup = lessons.map((l) => l.slug).filter((slug, i, all) => all.indexOf(slug) !== i);
  if (dup.length) throw new Error(`Duplicate lesson slugs: ${dup.join(", ")}`);

  await db.transaction(async (tx) => {
    await seedUser(tx);
    const { lessonIds, topicIds } = await seedCurriculum(tx, lessons);
    const problemIds = await seedProblems(tx, topicIds, lessons, lessonIds);
    await seedLabs(tx, topicIds);
    await seedCompanies(tx, topicIds, problemIds);
    await seedProjects(tx);
    await seedCalendar(tx);

    // Remove content that no longer exists in the source files.
    const slugs = lessons.map((l) => l.slug);
    if (slugs.length) {
      const stale = await tx
        .select({ id: s.lessons.id, slug: s.lessons.slug })
        .from(s.lessons)
        .where(notInArray(s.lessons.slug, slugs));
      if (stale.length) {
        await tx.delete(s.lessons).where(
          inArray(
            s.lessons.id,
            stale.map((x) => x.id),
          ),
        );
        console.log(`[seed] removed ${stale.length} stale lesson(s): ${stale.map((x) => x.slug).join(", ")}`);
      }
    }
  });

  console.log(
    `[seed] ${CURRICULUM.length} paths, ${lessons.length} lessons, ${PROBLEMS.length} problems, ${LABS.length} labs, ${COMPANIES.length} companies`,
  );
  if (warnings.length) {
    const unique = [...new Set(warnings)];
    console.log(`[seed] ${unique.length} warning(s) (content referenced before its lesson exists):`);
    for (const w of unique.slice(0, 25)) console.log(`  - ${w}`);
    if (unique.length > 25) console.log(`  … and ${unique.length - 25} more`);
  }
}

main()
  .catch((err) => {
    console.error("[seed] failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
