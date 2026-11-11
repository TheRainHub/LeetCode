/**
 * Deterministic interview questions generated from a project description.
 * Questions only reference what the user wrote; when a field is empty the
 * question asks the user to fill it in rather than assuming facts.
 */

export interface ProjectText {
  title: string;
  problem: string;
  context: string;
  responsibility: string;
  architecture: string;
  decisions: string;
  tradeoffs: string;
  challenges: string;
  result: string;
  lessonsLearned: string;
  techStack: string[];
}

export interface GeneratedQuestion {
  id: string;
  question: string;
  /** What a strong answer should contain. */
  lookFor: string;
  category: "overview" | "ownership" | "technical" | "decision" | "impact" | "behavioral" | "deep-dive";
  /** Set when the answer depends on a field the user hasn't filled in yet. */
  needsField?: keyof ProjectText;
}

const KEYWORD_QUESTIONS: { match: RegExp; q: GeneratedQuestion }[] = [
  {
    match: /false negative|reliab/i,
    q: {
      id: "kw-false-negatives",
      category: "deep-dive",
      question:
        "How did you evaluate the system's reliability — in particular false negatives? Why do false negatives matter so much in this domain?",
      lookFor:
        "A concrete evaluation setup (dataset, labels, what counted as a miss), precision vs recall trade-off, why a missed true positive is costly, honest limits of a small experiment.",
    },
  },
  {
    match: /llm|agent/i,
    q: {
      id: "kw-llm-structure",
      category: "technical",
      question:
        "How did you constrain the LLM agent's behaviour and output so results were usable and verifiable?",
      lookFor:
        "Structured outputs/schemas, tool boundaries, grounding in repository evidence, handling of uncertainty, prompt-injection awareness, human review.",
    },
  },
  {
    match: /repositor/i,
    q: {
      id: "kw-repo-exploration",
      category: "technical",
      question:
        "How did the agent explore the repository, and how did you keep that exploration efficient and safe?",
      lookFor:
        "Which tools/actions were available, limits on scope, how relevant code was found, read-only boundaries.",
    },
  },
  {
    match: /feature flag|growthbook/i,
    q: {
      id: "kw-flags-rollout",
      category: "technical",
      question:
        "How did the feature flag integration support safe rollout, and what happens when the flag service is unavailable?",
      lookFor:
        "Gradual rollout/targeting, default values and fallbacks, caching of flag state, testing both branches, cleanup of stale flags.",
    },
  },
  {
    match: /hash|privacy/i,
    q: {
      id: "kw-hashing-privacy",
      category: "deep-dive",
      question: "Why were identifiers hashed, and what privacy guarantees does hashing give — and not give?",
      lookFor:
        "Stable bucketing vs PII exposure, salts, hashing is not anonymisation for small ID spaces, what data leaves the system.",
    },
  },
  {
    match: /backstage|plugin/i,
    q: {
      id: "kw-backstage-plugins",
      category: "technical",
      question:
        "How is a Backstage plugin structured, and how did your work fit into the portal's architecture?",
      lookFor:
        "Frontend/backend plugins, routing and extension points, data sources (catalog, APIs), how changes were tested and shipped.",
    },
  },
  {
    match: /migrat/i,
    q: {
      id: "kw-migration",
      category: "decision",
      question: "How did you plan the migration so developers weren't disrupted?",
      lookFor:
        "Incremental steps, compatibility period, communication, rollback plan, how success was verified.",
    },
  },
  {
    match: /test/i,
    q: {
      id: "kw-testing",
      category: "technical",
      question: "How was this work tested, and what kind of bug would your tests not have caught?",
      lookFor: "Unit vs integration vs end-to-end, what was mocked, a specific gap and how you'd close it.",
    },
  },
];

export function generateProjectQuestions(p: ProjectText): GeneratedQuestion[] {
  const t = p.title;
  const qs: GeneratedQuestion[] = [
    {
      id: "overview",
      category: "overview",
      question: `Walk me through ${t}. What problem did it solve, and for whom?`,
      lookFor:
        "Context in two sentences, the problem, who benefited, your role — then stop and let the interviewer pick a direction.",
      needsField: p.problem.trim() ? undefined : "problem",
    },
    {
      id: "ownership",
      category: "ownership",
      question: `What exactly was your personal responsibility in ${t}, and what did other people own?`,
      lookFor: "Clear 'I' statements, boundaries with teammates, decisions you made yourself.",
      needsField: p.responsibility.trim() ? undefined : "responsibility",
    },
    {
      id: "architecture",
      category: "technical",
      question: `Sketch the architecture of ${t}. Where are the main components, boundaries and data flows?`,
      lookFor:
        "Components and their responsibilities, how data moves, external dependencies, where failures can happen.",
      needsField: p.architecture.trim() ? undefined : "architecture",
    },
    {
      id: "decision",
      category: "decision",
      question: `Pick one technical decision in ${t}. Which alternatives did you consider, and why did you choose this one?`,
      lookFor: "At least two real alternatives, explicit criteria, the trade-off accepted.",
      needsField: p.decisions.trim() ? undefined : "decisions",
    },
    {
      id: "tradeoff",
      category: "decision",
      question: `Which trade-off in ${t} would you revisit today, and what would you do differently?`,
      lookFor: "Honest reflection, what new information changes the decision, cost of changing it.",
      needsField: p.tradeoffs.trim() ? undefined : "tradeoffs",
    },
    {
      id: "challenge",
      category: "behavioral",
      question: `What was the hardest problem you hit in ${t}, and how did you work through it?`,
      lookFor: "STAR structure, concrete debugging steps or hypotheses, what you did vs what others did.",
      needsField: p.challenges.trim() ? undefined : "challenges",
    },
    {
      id: "impact",
      category: "impact",
      question: `How do you know ${t} was successful? What evidence do you have?`,
      lookFor:
        "Only real evidence — usage, feedback, measurements you actually took. If there are no metrics, say so and explain how you would measure it.",
      needsField: p.result.trim() ? undefined : "result",
    },
    {
      id: "lessons",
      category: "behavioral",
      question: `What did you learn from ${t} that changed how you work?`,
      lookFor: "A specific lesson tied to a specific moment, and how you've applied it since.",
      needsField: p.lessonsLearned.trim() ? undefined : "lessonsLearned",
    },
  ];
  const corpus = [
    p.title,
    p.problem,
    p.context,
    p.responsibility,
    p.architecture,
    p.decisions,
    p.tradeoffs,
    p.challenges,
    p.result,
    p.lessonsLearned,
    ...p.techStack,
  ].join(" ");
  for (const k of KEYWORD_QUESTIONS) if (k.match.test(corpus)) qs.push(k.q);
  return qs;
}

/** Fraction of narrative fields filled in (used to nudge the user to complete projects). */
export function projectCompleteness(p: ProjectText): number {
  const fields: (keyof ProjectText)[] = [
    "problem",
    "context",
    "responsibility",
    "architecture",
    "decisions",
    "tradeoffs",
    "challenges",
    "result",
    "lessonsLearned",
  ];
  return fields.filter((f) => String(p[f]).trim().length > 0).length / fields.length;
}
