import { z } from "zod";

/** Pipeline of a job posting, in the order a search usually moves through it. */
export const JOB_STATUSES = [
  "saved",
  "preparing",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "archived",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_SOURCES = ["manual", "url", "search"] as const;
export type JobSource = (typeof JOB_SOURCES)[number];

export const WORK_MODES = ["onsite", "hybrid", "remote"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const JOB_LEVELS = ["internship", "graduate", "junior", "mid"] as const;
export type JobLevel = (typeof JOB_LEVELS)[number];

const text = (max: number) => z.string().trim().max(max);

/** Everything here is entered by the user; nothing is inferred or invented. */
export const careerProfileSchema = z.object({
  resume: text(30_000),
  targetRoles: text(500),
  locations: text(500),
  workModes: z.array(z.enum(WORK_MODES)).max(WORK_MODES.length),
  levels: z.array(z.enum(JOB_LEVELS)).max(JOB_LEVELS.length),
  availability: text(500),
  workAuthorization: text(500),
  languages: text(300),
  salary: text(200),
  preferences: text(2000),
});
export type CareerProfile = z.infer<typeof careerProfileSchema>;

export const EMPTY_PROFILE: CareerProfile = {
  resume: "",
  targetRoles: "",
  locations: "",
  workModes: [],
  levels: [],
  availability: "",
  workAuthorization: "",
  languages: "",
  salary: "",
  preferences: "",
};

/** Characters of résumé text below which AI features ask for more. */
export const MIN_RESUME_CHARS = 200;

const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  }, "Enter a full http(s) link");

export const postingInputSchema = z.object({
  title: text(200).min(1, "Title is required"),
  company: text(200).min(1, "Company is required"),
  location: text(200),
  workMode: z.enum(WORK_MODES).nullable(),
  url: httpUrl.nullable(),
  description: text(40_000),
  notes: text(5000),
});
export type PostingInput = z.infer<typeof postingInputSchema>;

export const searchCriteriaSchema = z.object({
  roles: text(300),
  locations: text(300),
  workModes: z.array(z.enum(WORK_MODES)).max(WORK_MODES.length),
  levels: z.array(z.enum(JOB_LEVELS)).max(JOB_LEVELS.length),
  focus: text(1000),
});
export type SearchCriteria = z.infer<typeof searchCriteriaSchema>;

/** A page the model actually opened through web search or web fetch. */
export interface WebSource {
  url: string;
  title: string;
}

/** A job suggestion that survived validation: its link appeared in the search results. */
export interface FoundJob {
  title: string;
  company: string;
  location: string;
  workMode: WorkMode | "unknown";
  level: JobLevel | "senior" | "unknown";
  url: string;
  summary: string;
  whyFit: string;
  concerns: string;
  /** Application deadline exactly as the posting states it; empty when not stated. */
  deadline: string;
}

/** Stored result of the résumé-vs-posting analysis. */
export interface JobAnalysis {
  summary: string;
  fit: { score: number; verdict: "strong" | "good" | "stretch" | "weak"; reasoning: string };
  requirements: {
    requirement: string;
    importance: "must" | "nice";
    status: "met" | "partial" | "missing";
    evidence: string;
  }[];
  resume: {
    headline: string;
    emphasize: string[];
    deemphasize: string[];
    keywordsPresent: string[];
    keywordsMissing: string[];
    rewrites: { original: string; suggested: string; why: string }[];
    gaps: { gap: string; honestFraming: string; howToClose: string }[];
  };
  preparation: {
    focusAreas: {
      area: string;
      why: string;
      priority: "high" | "medium" | "low";
      lessons: string[];
      sdQuestions: string[];
    }[];
    stories: { story: string; useFor: string }[];
    process: string;
    processBasis: "sources" | "general";
    questionsToAsk: string[];
  };
  pitch: string;
  redFlags: string[];
}

export const STATUS_ORDER: Record<JobStatus, number> = Object.fromEntries(
  JOB_STATUSES.map((s, i) => [s, i]),
) as Record<JobStatus, number>;

/** Statuses that count as an active application in the overview. */
export const ACTIVE_STATUSES: JobStatus[] = ["saved", "preparing", "applied", "interviewing", "offer"];

/** How often a saved automatic search runs. */
export const AUTO_INTERVALS = [1, 3, 7] as const;
export type AutoInterval = (typeof AUTO_INTERVALS)[number];
/** Automatic searches cost API calls on every run, so their number is capped. */
export const MAX_AUTO_SEARCHES = 5;

export const autoSearchInputSchema = z.object({
  name: text(80).min(1, "Name is required"),
  criteria: searchCriteriaSchema,
  intervalDays: z.union([z.literal(1), z.literal(3), z.literal(7)]),
});
export type AutoSearchInput = z.infer<typeof autoSearchInputSchema>;

/** When a search that ran (or was scheduled) at `from` runs next. */
export function nextRunAfter(from: Date, intervalDays: number): Date {
  return new Date(from.getTime() + intervalDays * 24 * 60 * 60 * 1000);
}
