import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  EvaluationDimension,
  InterviewQuestion,
  LabFailureScenario,
  LabStep,
  Language,
  ProblemExample,
  ProblemSignature,
  ProblemTest,
  Reading,
} from "@/lib/content/types";

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const topicStatusEnum = pgEnum("topic_status", [
  "not_started",
  "learning",
  "practicing",
  "needs_review",
  "interview_ready",
]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const lessonDepthEnum = pgEnum("lesson_depth", ["full", "concise"]);
export const exerciseKindEnum = pgEnum("exercise_kind", ["mcq", "explain"]);
export const attemptOutcomeEnum = pgEnum("attempt_outcome", ["passed", "partial", "failed", "not_run"]);
export const executionModeEnum = pgEnum("execution_mode", ["browser", "local", "none"]);
export const independenceEnum = pgEnum("independence", ["independent", "with_hints", "with_solution"]);
export const labStatusEnum = pgEnum("lab_status", ["in_progress", "verified"]);
export const interviewTypeEnum = pgEnum("interview_type", [
  "algorithms",
  "core_cs",
  "backend",
  "fullstack",
  "system_design",
  "behavioral",
  "ai_engineering",
]);
export const interviewStatusEnum = pgEnum("interview_status", [
  "in_progress",
  "evaluating",
  "completed",
  "abandoned",
]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);
export const messageKindEnum = pgEnum("message_kind", ["normal", "hint_request", "opening"]);
export const applicationStageEnum = pgEnum("application_stage", [
  "applied",
  "screening",
  "technical",
  "final",
  "offer",
  "rejected",
]);
export const taskKindEnum = pgEnum("task_kind", [
  "lesson",
  "problem",
  "review",
  "lab",
  "mock",
  "experience",
  "custom",
]);
export const taskStatusEnum = pgEnum("task_status", ["todo", "done", "skipped"]);
export const eventKindEnum = pgEnum("event_kind", ["university", "interview", "unavailable", "other"]);
export const reviewGradeEnum = pgEnum("review_grade", ["again", "hard", "good", "easy"]);
export const cardSourceEnum = pgEnum("card_source", ["lesson", "interview", "manual"]);
export const gradedByEnum = pgEnum("graded_by", ["auto", "self", "ai"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();
const id = () => integer("id").primaryKey().generatedAlwaysAsIdentity();
const userRef = () =>
  integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });

/* ------------------------------------------------------------------ */
/* Users & settings                                                    */
/* ------------------------------------------------------------------ */

export const users = pgTable("users", {
  id: id(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export const userSettings = pgTable("user_settings", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  locale: text("locale").$type<"en" | "ru">().default("en").notNull(),
  theme: text("theme").$type<"dark" | "light">().default("dark").notNull(),
  timezone: text("timezone").default("Europe/Prague").notNull(),
  dailyBudgetMinutes: integer("daily_budget_minutes").default(90).notNull(),
  /** 0 = Sunday … 6 = Saturday */
  restWeekdays: integer("rest_weekdays").array().default(sql`'{}'::integer[]`).notNull(),
  prioritizeUniversity: boolean("prioritize_university").default(true).notNull(),
  preferredLanguage: text("preferred_language").$type<Language>().default("java").notNull(),
  /** Background the AI interviewer may use. User-editable; seeded from what the user told us. */
  interviewerProfile: text("interviewer_profile").default("").notNull(),
  lastRescheduledOn: date("last_rescheduled_on", { mode: "string" }),
  updatedAt: updatedAt(),
});

/* ------------------------------------------------------------------ */
/* Curriculum                                                          */
/* ------------------------------------------------------------------ */

export const learningPaths = pgTable("learning_paths", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  area: text("area").notNull(),
  description: text("description").notNull(),
  order: integer("order").notNull(),
});

export const modules = pgTable(
  "modules",
  {
    id: id(),
    pathId: integer("path_id")
      .notNull()
      .references(() => learningPaths.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    order: integer("order").notNull(),
  },
  (t) => [index("modules_path_idx").on(t.pathId)],
);

export const topics = pgTable("topics", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  area: text("area").notNull(),
  summary: text("summary").notNull(),
  practiceKind: text("practice_kind").$type<"coding" | "lab" | "conceptual">().notNull(),
});

export const lessons = pgTable(
  "lessons",
  {
    id: id(),
    moduleId: integer("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    topicId: integer("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    order: integer("order").notNull(),
    estimatedMinutes: integer("estimated_minutes").notNull(),
    depth: lessonDepthEnum("depth").notNull(),
    objectives: jsonb("objectives").$type<string[]>().notNull(),
    explanation: text("explanation").notNull(),
    workedExamples: text("worked_examples").notNull(),
    misconceptions: text("misconceptions").notNull(),
    practicalExercises: text("practical_exercises").notNull(),
    interviewQuestions: jsonb("interview_questions").$type<InterviewQuestion[]>().notNull(),
    selfAssessment: jsonb("self_assessment").$type<string[]>().notNull(),
    completionCriteria: jsonb("completion_criteria").$type<string[]>().notNull(),
    readings: jsonb("readings").$type<Reading[]>().notNull(),
    searchText: text("search_text").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [index("lessons_module_idx").on(t.moduleId), index("lessons_topic_idx").on(t.topicId)],
);

export const lessonPrerequisites = pgTable(
  "lesson_prerequisites",
  {
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    prerequisiteId: integer("prerequisite_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.lessonId, t.prerequisiteId] })],
);

export const exercises = pgTable(
  "exercises",
  {
    id: id(),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    kind: exerciseKindEnum("kind").notNull(),
    order: integer("order").notNull(),
    prompt: text("prompt").notNull(),
    options: jsonb("options").$type<string[]>(),
    correctOption: integer("correct_option"),
    explanation: text("explanation"),
    rubric: jsonb("rubric").$type<string[]>(),
    modelAnswer: text("model_answer"),
  },
  (t) => [index("exercises_lesson_idx").on(t.lessonId)],
);

/* ------------------------------------------------------------------ */
/* Coding problems                                                     */
/* ------------------------------------------------------------------ */

export const codingProblems = pgTable("coding_problems", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  difficulty: difficultyEnum("difficulty").notNull(),
  order: integer("order").notNull(),
  pattern: text("pattern").notNull(),
  summary: text("summary").notNull(),
  statement: text("statement").notNull(),
  constraints: jsonb("constraints").$type<string[]>().notNull(),
  examples: jsonb("examples").$type<ProblemExample[]>().notNull(),
  hints: jsonb("hints").$type<string[]>().notNull(),
  approach: text("approach").notNull(),
  solutionCode: jsonb("solution_code").$type<Record<Language, string>>().notNull(),
  edgeCases: jsonb("edge_cases").$type<string[]>().notNull(),
  expectedTime: text("expected_time").notNull(),
  expectedSpace: text("expected_space").notNull(),
  complexityNotes: text("complexity_notes").notNull(),
  commonMistakes: jsonb("common_mistakes").$type<string[]>().notNull(),
  signature: jsonb("signature").$type<ProblemSignature>().notNull(),
  comparator: text("comparator").$type<"exact" | "unorderedList" | "unorderedNested">().notNull(),
  starterCode: jsonb("starter_code").$type<Record<Language, string>>().notNull(),
  tests: jsonb("tests").$type<ProblemTest[]>().notNull(),
  externalLinks: jsonb("external_links").$type<{ title: string; url: string }[]>().notNull(),
});

export const problemTags = pgTable(
  "problem_tags",
  {
    problemId: integer("problem_id")
      .notNull()
      .references(() => codingProblems.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (t) => [primaryKey({ columns: [t.problemId, t.tag] })],
);

export const problemTopics = pgTable(
  "problem_topics",
  {
    problemId: integer("problem_id")
      .notNull()
      .references(() => codingProblems.id, { onDelete: "cascade" }),
    topicId: integer("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.problemId, t.topicId] })],
);

export const lessonProblems = pgTable(
  "lesson_problems",
  {
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    problemId: integer("problem_id")
      .notNull()
      .references(() => codingProblems.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.lessonId, t.problemId] })],
);

export const codeDrafts = pgTable(
  "code_drafts",
  {
    userId: userRef(),
    problemId: integer("problem_id")
      .notNull()
      .references(() => codingProblems.id, { onDelete: "cascade" }),
    language: text("language").$type<Language>().notNull(),
    code: text("code").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.problemId, t.language] })],
);

export const problemNotes = pgTable(
  "problem_notes",
  {
    userId: userRef(),
    problemId: integer("problem_id")
      .notNull()
      .references(() => codingProblems.id, { onDelete: "cascade" }),
    notes: text("notes").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.problemId] })],
);

export const customTestCases = pgTable(
  "custom_test_cases",
  {
    id: id(),
    userId: userRef(),
    problemId: integer("problem_id")
      .notNull()
      .references(() => codingProblems.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    args: jsonb("args").$type<unknown[]>().notNull(),
    expected: jsonb("expected").$type<unknown>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("custom_tests_problem_idx").on(t.userId, t.problemId)],
);

export interface StoredTestResult {
  name: string;
  passed: boolean;
  /** JSON-encoded actual value, or an error message. */
  actual?: string;
  expected?: string;
  error?: string;
  durationMs?: number;
}

export const codingAttempts = pgTable(
  "coding_attempts",
  {
    id: id(),
    userId: userRef(),
    problemId: integer("problem_id")
      .notNull()
      .references(() => codingProblems.id, { onDelete: "cascade" }),
    language: text("language").$type<Language>().notNull(),
    code: text("code").notNull(),
    outcome: attemptOutcomeEnum("outcome").notNull(),
    executionMode: executionModeEnum("execution_mode").notNull(),
    testsPassed: integer("tests_passed").default(0).notNull(),
    testsTotal: integer("tests_total").default(0).notNull(),
    testResults: jsonb("test_results").$type<StoredTestResult[]>().notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    hintsUsed: integer("hints_used").default(0).notNull(),
    viewedSolution: boolean("viewed_solution").default(false).notNull(),
    independence: independenceEnum("independence").notNull(),
    claimedTime: text("claimed_time").notNull(),
    claimedSpace: text("claimed_space").notNull(),
    timeCorrect: boolean("time_correct"),
    spaceCorrect: boolean("space_correct"),
    reflection: text("reflection").default("").notNull(),
    confidence: integer("confidence").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("coding_attempts_user_problem_idx").on(t.userId, t.problemId)],
);

/* ------------------------------------------------------------------ */
/* Learning evidence                                                   */
/* ------------------------------------------------------------------ */

export const exerciseAttempts = pgTable(
  "exercise_attempts",
  {
    id: id(),
    userId: userRef(),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    selectedOption: integer("selected_option"),
    responseText: text("response_text"),
    rubricChecks: jsonb("rubric_checks").$type<boolean[]>(),
    /** 0..1 */
    score: real("score").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    interviewMode: boolean("interview_mode").default(false).notNull(),
    durationSeconds: integer("duration_seconds").default(0).notNull(),
    gradedBy: gradedByEnum("graded_by").notNull(),
    feedback: text("feedback"),
    createdAt: createdAt(),
  },
  (t) => [index("exercise_attempts_user_idx").on(t.userId, t.exerciseId)],
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    userId: userRef(),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    confidence: integer("confidence"),
    notes: text("notes").default("").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
);

/**
 * Derived cache of per-topic mastery. Counters and evidence timestamps are
 * always recomputed from the source tables (attempts, reviews, labs,
 * interviews) by `recomputeTopicProgress`; only `priority` and `confidence`
 * are user-owned.
 */
export const topicProgress = pgTable(
  "topic_progress",
  {
    userId: userRef(),
    topicId: integer("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    status: topicStatusEnum("status").default("not_started").notNull(),
    /** -1 low, 0 normal, 1 high, 2 critical */
    priority: integer("priority").default(0).notNull(),
    confidence: integer("confidence"),
    readAt: timestamp("read_at", { withTimezone: true }),
    recognizedAt: timestamp("recognized_at", { withTimezone: true }),
    implementedAt: timestamp("implemented_at", { withTimezone: true }),
    explainedAt: timestamp("explained_at", { withTimezone: true }),
    labVerifiedAt: timestamp("lab_verified_at", { withTimezone: true }),
    lastPracticedAt: timestamp("last_practiced_at", { withTimezone: true }),
    attempts: integer("attempts").default(0).notNull(),
    correct: integer("correct").default(0).notNull(),
    incorrect: integer("incorrect").default(0).notNull(),
    hintsUsed: integer("hints_used").default(0).notNull(),
    avgSolveSeconds: integer("avg_solve_seconds"),
    nextReviewOn: date("next_review_on", { mode: "string" }),
    /** Requirements still missing for interview readiness (MissingRequirement keys). */
    missing: jsonb("missing").$type<string[]>().default([]).notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.topicId] })],
);

/* ------------------------------------------------------------------ */
/* Labs                                                                */
/* ------------------------------------------------------------------ */

export const practicalLabs = pgTable("practical_labs", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  area: text("area").notNull(),
  order: integer("order").notNull(),
  summary: text("summary").notNull(),
  estimatedMinutes: integer("estimated_minutes").notNull(),
  difficulty: difficultyEnum("difficulty").notNull(),
  objectives: jsonb("objectives").$type<string[]>().notNull(),
  prerequisites: jsonb("prerequisites").$type<string[]>().notNull(),
  tools: jsonb("tools").$type<string[]>().notNull(),
  deliverables: jsonb("deliverables").$type<string[]>().notNull(),
  steps: jsonb("steps").$type<LabStep[]>().notNull(),
  failureScenarios: jsonb("failure_scenarios").$type<LabFailureScenario[]>().notNull(),
  reflectionQuestions: jsonb("reflection_questions").$type<string[]>().notNull(),
});

export const labTopics = pgTable(
  "lab_topics",
  {
    labId: integer("lab_id")
      .notNull()
      .references(() => practicalLabs.id, { onDelete: "cascade" }),
    topicId: integer("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.labId, t.topicId] })],
);

export interface StepEvidence {
  text?: string;
  checked?: boolean;
  passed: boolean;
}

export const labAttempts = pgTable(
  "lab_attempts",
  {
    id: id(),
    userId: userRef(),
    labId: integer("lab_id")
      .notNull()
      .references(() => practicalLabs.id, { onDelete: "cascade" }),
    status: labStatusEnum("status").default("in_progress").notNull(),
    stepEvidence: jsonb("step_evidence").$type<Record<string, StepEvidence>>().default({}).notNull(),
    reflections: jsonb("reflections").$type<string[]>().default([]).notNull(),
    minutesSpent: integer("minutes_spent").default(0).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    updatedAt: updatedAt(),
  },
  (t) => [index("lab_attempts_user_idx").on(t.userId, t.labId)],
);

/* ------------------------------------------------------------------ */
/* Companies & applications                                            */
/* ------------------------------------------------------------------ */

export const companies = pgTable("companies", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  order: integer("order").notNull(),
  overview: text("overview").notNull(),
  techStack: jsonb("tech_stack").$type<string[]>().notNull(),
  prepNotes: text("prep_notes").notNull(),
  sourceNote: text("source_note").notNull(),
});

export const companyFocusTopics = pgTable(
  "company_focus_topics",
  {
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    topicId: integer("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    /** 0 = excluded by the user, 1 = useful, 2 = important, 3 = core */
    weight: integer("weight").notNull(),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.topicId] })],
);

export const companyProblems = pgTable(
  "company_problems",
  {
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    problemId: integer("problem_id")
      .notNull()
      .references(() => codingProblems.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.problemId] })],
);

export const interviewPresets = pgTable("interview_presets", {
  id: id(),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: interviewTypeEnum("type").notNull(),
  difficulty: difficultyEnum("difficulty").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  language: text("language").$type<Language>().notNull(),
  order: integer("order").notNull(),
});

export const companyChecklistItems = pgTable(
  "company_checklist_items",
  {
    id: id(),
    userId: userRef(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    done: boolean("done").default(false).notNull(),
    order: integer("order").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("checklist_company_idx").on(t.userId, t.companyId)],
);

export const companyNotes = pgTable(
  "company_notes",
  {
    userId: userRef(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    notes: text("notes").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.companyId] })],
);

export const applications = pgTable(
  "applications",
  {
    id: id(),
    userId: userRef(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    stage: applicationStageEnum("stage").notNull(),
    notes: text("notes").default("").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("applications_user_company_idx").on(t.userId, t.companyId)],
);

export const applicationEvents = pgTable(
  "application_events",
  {
    id: id(),
    applicationId: integer("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    stage: applicationStageEnum("stage").notNull(),
    occurredOn: date("occurred_on", { mode: "string" }).notNull(),
    note: text("note").default("").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("application_events_app_idx").on(t.applicationId)],
);

/* ------------------------------------------------------------------ */
/* Mock interviews                                                     */
/* ------------------------------------------------------------------ */

export const mockInterviews = pgTable(
  "mock_interviews",
  {
    id: id(),
    userId: userRef(),
    companyId: integer("company_id").references(() => companies.id, { onDelete: "set null" }),
    type: interviewTypeEnum("type").notNull(),
    difficulty: difficultyEnum("difficulty").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    language: text("language").$type<Language>().notNull(),
    status: interviewStatusEnum("status").default("in_progress").notNull(),
    model: text("model").notNull(),
    /** Frozen at creation so the conversation prefix never changes. */
    systemPrompt: text("system_prompt").notNull(),
    hintsRequested: integer("hints_requested").default(0).notNull(),
    lastError: text("last_error"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [index("mock_interviews_user_idx").on(t.userId)],
);

export const interviewMessages = pgTable(
  "interview_messages",
  {
    id: id(),
    interviewId: integer("interview_id")
      .notNull()
      .references(() => mockInterviews.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    role: messageRoleEnum("role").notNull(),
    kind: messageKindEnum("kind").default("normal").notNull(),
    /** Text shown in the UI. */
    content: text("content").notNull(),
    /** Exact content sent to / received from the API (assistant blocks incl. thinking), replayed unchanged. */
    apiContent: jsonb("api_content").$type<unknown>().notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("interview_messages_seq_idx").on(t.interviewId, t.seq)],
);

export const interviewEvaluations = pgTable("interview_evaluations", {
  id: id(),
  interviewId: integer("interview_id")
    .notNull()
    .unique()
    .references(() => mockInterviews.id, { onDelete: "cascade" }),
  overallScore: integer("overall_score").notNull(),
  summary: text("summary").notNull(),
  dimensions: jsonb("dimensions").$type<Record<string, EvaluationDimension>>().notNull(),
  strengths: jsonb("strengths").$type<string[]>().notNull(),
  weaknesses: jsonb("weaknesses").$type<string[]>().notNull(),
  mistakes: jsonb("mistakes").$type<{ description: string; evidence: string; correction: string }[]>().notNull(),
  modelAnswer: text("model_answer").notNull(),
  recommendedTopics: jsonb("recommended_topics").$type<{ topicSlug: string; reason: string }[]>().notNull(),
  followUpExercises: jsonb("follow_up_exercises")
    .$type<{ title: string; description: string; problemSlug?: string | null }[]>()
    .notNull(),
  srsSuggestions: jsonb("srs_suggestions").$type<{ prompt: string; answer: string; topicSlug?: string | null }[]>().notNull(),
  model: text("model").notNull(),
  createdAt: createdAt(),
});

export const interviewTopics = pgTable(
  "interview_topics",
  {
    interviewId: integer("interview_id")
      .notNull()
      .references(() => mockInterviews.id, { onDelete: "cascade" }),
    topicId: integer("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    /** 0..1 score attributed to this topic by the evaluator */
    score: real("score").notNull(),
  },
  (t) => [primaryKey({ columns: [t.interviewId, t.topicId] })],
);

/* ------------------------------------------------------------------ */
/* Scheduling                                                          */
/* ------------------------------------------------------------------ */

export const studyPlans = pgTable("study_plans", {
  id: id(),
  userId: userRef(),
  name: text("name").notNull(),
  templateKey: text("template_key").notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: createdAt(),
});

export const studySessions = pgTable(
  "study_sessions",
  {
    id: id(),
    planId: integer("plan_id")
      .notNull()
      .references(() => studyPlans.id, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    title: text("title").notNull(),
    focus: text("focus").notNull(),
  },
  (t) => [index("study_sessions_plan_idx").on(t.planId)],
);

export const studyTasks = pgTable(
  "study_tasks",
  {
    id: id(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => studySessions.id, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    kind: taskKindEnum("kind").notNull(),
    title: text("title").notNull(),
    refSlug: text("ref_slug"),
    estimatedMinutes: integer("estimated_minutes").notNull(),
    scheduledDate: date("scheduled_date", { mode: "string" }).notNull(),
    pinned: boolean("pinned").default(false).notNull(),
    overCapacity: boolean("over_capacity").default(false).notNull(),
    status: taskStatusEnum("status").default("todo").notNull(),
    timesMoved: integer("times_moved").default(0).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("study_tasks_date_idx").on(t.scheduledDate), index("study_tasks_session_idx").on(t.sessionId)],
);

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: id(),
    userId: userRef(),
    kind: eventKindEnum("kind").notNull(),
    title: text("title").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    /** For university obligations: days before the date that stay lightweight. */
    lightDaysBefore: integer("light_days_before").default(0).notNull(),
    companyId: integer("company_id").references(() => companies.id, { onDelete: "set null" }),
    notes: text("notes").default("").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("calendar_events_user_date_idx").on(t.userId, t.date)],
);

export const weeklyObjectives = pgTable(
  "weekly_objectives",
  {
    id: id(),
    userId: userRef(),
    weekStart: date("week_start", { mode: "string" }).notNull(),
    text: text("text").notNull(),
    done: boolean("done").default(false).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("weekly_objectives_user_week_idx").on(t.userId, t.weekStart)],
);

/* ------------------------------------------------------------------ */
/* Spaced repetition                                                   */
/* ------------------------------------------------------------------ */

export const reviewCards = pgTable(
  "review_cards",
  {
    id: id(),
    userId: userRef(),
    topicId: integer("topic_id").references(() => topics.id, { onDelete: "set null" }),
    prompt: text("prompt").notNull(),
    answer: text("answer").notNull(),
    source: cardSourceEnum("source").notNull(),
    /** e.g. lesson slug + index, interview id. Used to keep seeding idempotent. */
    sourceRef: text("source_ref"),
    suspended: boolean("suspended").default(false).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("review_cards_user_topic_idx").on(t.userId, t.topicId),
    uniqueIndex("review_cards_source_ref_idx").on(t.userId, t.sourceRef),
  ],
);

export const reviewSchedules = pgTable(
  "review_schedules",
  {
    id: id(),
    userId: userRef(),
    cardId: integer("card_id").references(() => reviewCards.id, { onDelete: "cascade" }),
    problemId: integer("problem_id").references(() => codingProblems.id, { onDelete: "cascade" }),
    ease: real("ease").default(2.5).notNull(),
    intervalDays: integer("interval_days").default(0).notNull(),
    repetitions: integer("repetitions").default(0).notNull(),
    lapses: integer("lapses").default(0).notNull(),
    dueOn: date("due_on", { mode: "string" }).notNull(),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("review_schedules_card_idx").on(t.userId, t.cardId),
    uniqueIndex("review_schedules_problem_idx").on(t.userId, t.problemId),
    index("review_schedules_due_idx").on(t.userId, t.dueOn),
    check(
      "review_schedules_one_target",
      sql`(${t.cardId} IS NOT NULL AND ${t.problemId} IS NULL) OR (${t.cardId} IS NULL AND ${t.problemId} IS NOT NULL)`,
    ),
  ],
);

export const reviewLogs = pgTable(
  "review_logs",
  {
    id: id(),
    scheduleId: integer("schedule_id")
      .notNull()
      .references(() => reviewSchedules.id, { onDelete: "cascade" }),
    grade: reviewGradeEnum("grade").notNull(),
    intervalBefore: integer("interval_before").notNull(),
    intervalAfter: integer("interval_after").notNull(),
    elapsedSeconds: integer("elapsed_seconds").default(0).notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("review_logs_schedule_idx").on(t.scheduleId)],
);

/* ------------------------------------------------------------------ */
/* Experience & behavioral                                             */
/* ------------------------------------------------------------------ */

export const personalProjects = pgTable("personal_projects", {
  id: id(),
  userId: userRef(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  organization: text("organization").notNull(),
  period: text("period").default("").notNull(),
  techStack: jsonb("tech_stack").$type<string[]>().default([]).notNull(),
  problem: text("problem").default("").notNull(),
  context: text("context").default("").notNull(),
  responsibility: text("responsibility").default("").notNull(),
  architecture: text("architecture").default("").notNull(),
  decisions: text("decisions").default("").notNull(),
  tradeoffs: text("tradeoffs").default("").notNull(),
  challenges: text("challenges").default("").notNull(),
  result: text("result").default("").notNull(),
  lessonsLearned: text("lessons_learned").default("").notNull(),
  /** True until the user confirms the seeded description is accurate. */
  needsReview: boolean("needs_review").default(true).notNull(),
  updatedAt: updatedAt(),
});

export const starStories = pgTable("star_stories", {
  id: id(),
  userId: userRef(),
  projectId: integer("project_id").references(() => personalProjects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  competency: text("competency").notNull(),
  situation: text("situation").default("").notNull(),
  task: text("task").default("").notNull(),
  action: text("action").default("").notNull(),
  result: text("result").default("").notNull(),
  reflection: text("reflection").default("").notNull(),
  updatedAt: updatedAt(),
});

export const experiencePractice = pgTable("experience_practice", {
  id: id(),
  userId: userRef(),
  projectId: integer("project_id").references(() => personalProjects.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  /** 1..5 self rating */
  selfScore: integer("self_score").notNull(),
  durationSeconds: integer("duration_seconds").default(0).notNull(),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------------ */
/* Time tracking                                                       */
/* ------------------------------------------------------------------ */

export const timeEntries = pgTable(
  "time_entries",
  {
    id: id(),
    userId: userRef(),
    date: date("date", { mode: "string" }).notNull(),
    seconds: integer("seconds").notNull(),
    kind: text("kind")
      .$type<"lesson" | "problem" | "review" | "lab" | "interview" | "experience" | "exercise">()
      .notNull(),
    ref: text("ref"),
    createdAt: createdAt(),
  },
  (t) => [index("time_entries_user_date_idx").on(t.userId, t.date)],
);
