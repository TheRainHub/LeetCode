import "server-only";
import { env } from "@/lib/env";

/** AI features are enabled only when an API key is configured on the server. */
export function isAiConfigured(): boolean {
  return Boolean(env().ANTHROPIC_API_KEY);
}

export function aiModel(): string {
  return env().ANTHROPIC_MODEL;
}
