import { databaseUrl } from "@/lib/db/url";
import { z } from "zod";

const effort = z.enum(["low", "medium", "high", "xhigh", "max"]);

const schema = z.object({
  DATABASE_URL: z.string().min(1).default("postgres://interviewos:interviewos@localhost:5432/interviewos"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().min(1).default("claude-opus-5-5"),
  ANTHROPIC_EFFORT_CHAT: effort.default("medium"),
  ANTHROPIC_EFFORT_EVALUATION: effort.default("high"),
  ANTHROPIC_MAX_TOKENS_CHAT: z.coerce.number().int().min(1024).max(64000).default(8000),
  ANTHROPIC_MAX_TOKENS_EVALUATION: z.coerce.number().int().min(2048).max(64000).default(16000),
  ANTHROPIC_FALLBACKS: z.enum(["default", "off"]).default("default"),
  APP_TIMEZONE: z.string().min(1).default("Europe/Prague"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Validated server environment. Never import this from client components. */
export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse({ ...process.env, DATABASE_URL: databaseUrl() });
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Invalid environment configuration: ${issues}`);
    }
    // Treat an empty key as "not configured".
    cached = { ...parsed.data, ANTHROPIC_API_KEY: parsed.data.ANTHROPIC_API_KEY?.trim() || undefined };
  }
  return cached;
}
