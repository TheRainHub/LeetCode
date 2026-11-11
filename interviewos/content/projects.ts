import type { ProjectDef } from "@/lib/content/defs";

/**
 * Seeded "My Engineering Experience" projects. They contain ONLY what the user
 * stated. Every other field is left empty for the user to fill in — no metrics,
 * team sizes or outcomes are invented. Projects stay flagged "needs review"
 * until the user confirms them.
 */
export const PROJECTS: ProjectDef[] = [
  {
    slug: "llm-vulnerability-triage",
    title: "LLM Vulnerability Triage",
    organization: "Make",
    techStack: ["LLM agents", "TypeScript / Node.js"],
    problem: "Vulnerability alerts need investigation to decide whether they actually affect the codebase.",
    context:
      "Developer Experience team at Make. LLM agents investigate vulnerability alerts by exploring the repository and producing structured assessments.",
    responsibility: "",
    architecture:
      "- LLM agents investigating vulnerability alerts\n- Repository exploration by the agent\n- Structured assessments as output",
    decisions: "",
    tradeoffs: "",
    challenges:
      "Reliability of agent conclusions; false negatives (real vulnerabilities assessed as not affecting the code).",
    result: "A small experimental evaluation was performed.",
    lessonsLearned: "",
  },
  {
    slug: "growthbook-feature-flags",
    title: "GrowthBook Feature Flags",
    organization: "Make",
    techStack: ["GrowthBook", "TypeScript / Node.js"],
    problem: "",
    context: "Feature flag integration using GrowthBook.",
    responsibility: "",
    architecture: "- GrowthBook SDK integration\n- Privacy considerations and hashing",
    decisions: "",
    tradeoffs: "",
    challenges: "",
    result: "",
    lessonsLearned: "Areas involved: testing and rollout.",
  },
  {
    slug: "backstage-developer-portal",
    title: "Backstage Developer Portal",
    organization: "Make",
    techStack: ["Backstage", "React", "TypeScript"],
    problem: "",
    context: "Developer tooling: the company's Backstage developer portal.",
    responsibility: "UI and navigation improvements; plugins; migration work.",
    architecture: "- Backstage plugins",
    decisions: "",
    tradeoffs: "",
    challenges: "",
    result: "",
    lessonsLearned: "",
  },
];

/** Default interviewer background, built only from facts the user provided. Editable in Settings. */
export const DEFAULT_INTERVIEWER_PROFILE = `Software Engineering student at Czech Technical University in Prague.
About six months as a Software Engineer Intern at Make (formerly Integromat), Developer Experience team: TypeScript, Node.js, PostgreSQL, Docker, Kubernetes, ArgoCD, CI/CD; Backstage developer portal; GrowthBook feature flag integrations; LLM-powered vulnerability analysis agents.
Research involving mutation testing and AI-generated code tests.
Also knows Java, Spring Boot, Python, React and SQL; builds personal fullstack applications; basic understanding of algorithms and data structures.
Known growth areas: translating an algorithmic idea into correct code under pressure, implementation details, fundamentals in algorithms, Java, networking, concurrency and system design, explaining engineering decisions without AI assistance.`;
