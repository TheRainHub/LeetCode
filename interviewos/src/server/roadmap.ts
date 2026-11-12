import "server-only";
import { asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { learningPaths, lessonPrerequisites, lessons, modules } from "@/lib/db/schema";
import type { TopicStatus } from "@/lib/mastery/status";
import { getTopicStates } from "./insights";

export interface RoadmapLesson {
  slug: string;
  title: string;
  path: string;
  module: string;
  moduleOrder: number;
  order: number;
  minutes: number;
  status: TopicStatus;
  prerequisites: string[];
  /** Not started, and every prerequisite is at least practised. */
  next: boolean;
}

export interface RoadmapPath {
  slug: string;
  title: string;
  order: number;
  total: number;
  started: number;
  practised: number;
  ready: number;
}

const PRACTISED: TopicStatus[] = ["practicing", "needs_review", "interview_ready"];

export async function getRoadmap() {
  const prereq = alias(lessons, "prereq");
  const [pathRows, lessonRows, prereqRows, topics] = await Promise.all([
    db.select().from(learningPaths).orderBy(asc(learningPaths.order)),
    db
      .select({
        slug: lessons.slug,
        title: lessons.title,
        order: lessons.order,
        minutes: lessons.estimatedMinutes,
        module: modules.title,
        moduleOrder: modules.order,
        path: learningPaths.slug,
      })
      .from(lessons)
      .innerJoin(modules, eq(modules.id, lessons.moduleId))
      .innerJoin(learningPaths, eq(learningPaths.id, modules.pathId)),
    db
      .select({ lesson: lessons.slug, prerequisite: prereq.slug })
      .from(lessonPrerequisites)
      .innerJoin(lessons, eq(lessons.id, lessonPrerequisites.lessonId))
      .innerJoin(prereq, eq(prereq.id, lessonPrerequisites.prerequisiteId)),
    getTopicStates(),
  ]);
  const status = new Map(topics.map((t) => [t.slug, t.status]));
  const prereqs = new Map<string, string[]>();
  for (const r of prereqRows) prereqs.set(r.lesson, [...(prereqs.get(r.lesson) ?? []), r.prerequisite]);

  const lessonsOut: RoadmapLesson[] = lessonRows.map((l) => {
    const s = status.get(l.slug) ?? "not_started";
    const ps = prereqs.get(l.slug) ?? [];
    return {
      ...l,
      status: s,
      prerequisites: ps,
      next: s === "not_started" && ps.every((p) => PRACTISED.includes(status.get(p) ?? "not_started")),
    };
  });
  const paths: RoadmapPath[] = pathRows.map((p) => {
    const ls = lessonsOut.filter((l) => l.path === p.slug);
    return {
      slug: p.slug,
      title: p.title,
      order: p.order,
      total: ls.length,
      started: ls.filter((l) => l.status !== "not_started").length,
      practised: ls.filter((l) => PRACTISED.includes(l.status)).length,
      ready: ls.filter((l) => l.status === "interview_ready").length,
    };
  });
  return { paths, lessons: lessonsOut };
}
