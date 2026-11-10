import type {
  Comparator,
  LabFailureScenario,
  LabStep,
  Language,
  ProblemExample,
  ProblemSignature,
  ProblemTest,
} from "./types";

/** Authoring shape for coding problems (content/problems). */
export interface ProblemDef {
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  order: number;
  pattern: string;
  tags: string[];
  topics: string[];
  summary: string;
  statement: string;
  constraints: string[];
  examples: ProblemExample[];
  hints: string[];
  approach: string;
  solutions: Record<Language, string>;
  edgeCases: string[];
  expectedTime: string;
  expectedSpace: string;
  complexityNotes: string;
  commonMistakes: string[];
  signature: ProblemSignature;
  comparator: Comparator;
  tests: ProblemTest[];
  externalLinks: { title: string; url: string }[];
  /** Optional override; otherwise generated from the signature. */
  starterCode?: Partial<Record<Language, string>>;
  /** Target solve time in minutes for interview conditions. */
  targetMinutes: number;
}

export interface LabDef {
  slug: string;
  title: string;
  area: string;
  order: number;
  summary: string;
  estimatedMinutes: number;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
  objectives: string[];
  prerequisites: string[];
  tools: string[];
  deliverables: string[];
  steps: LabStep[];
  failureScenarios: LabFailureScenario[];
  reflectionQuestions: string[];
}

export interface CompanyDef {
  slug: string;
  name: string;
  role: string;
  order: number;
  overview: string;
  techStack: string[];
  prepNotes: string;
  sourceNote: string;
  /** topic slug → weight (1 useful, 2 important, 3 core) */
  focus: Record<string, 1 | 2 | 3>;
  problems: string[];
  presets: {
    title: string;
    type: "algorithms" | "core_cs" | "backend" | "fullstack" | "system_design" | "behavioral" | "ai_engineering";
    difficulty: "easy" | "medium" | "hard";
    durationMinutes: number;
    language: Language;
  }[];
  checklist: string[];
}

export interface PlanTaskDef {
  kind: "lesson" | "problem" | "review" | "lab" | "mock" | "experience" | "custom";
  title: string;
  refSlug?: string;
  minutes: number;
}

export interface PlanSessionDef {
  title: string;
  focus: string;
  tasks: PlanTaskDef[];
}

export interface PlanTemplateDef {
  key: string;
  name: string;
  description: string;
  /** Dates of the historical plan this template was derived from (informational). */
  historicalRange: { start: string; end: string };
  sessions: PlanSessionDef[];
}

export interface ProjectDef {
  slug: string;
  title: string;
  organization: string;
  techStack: string[];
  problem: string;
  context: string;
  responsibility: string;
  architecture: string;
  decisions: string;
  tradeoffs: string;
  challenges: string;
  result: string;
  lessonsLearned: string;
}
