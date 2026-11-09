import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { isAiConfigured } from "./config";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI features are disabled: set ANTHROPIC_API_KEY on the server.");
    this.name = "AiNotConfiguredError";
  }
}

export class AiRefusalError extends Error {
  constructor(detail?: string | null) {
    super(`The model declined this request${detail ? `: ${detail}` : "."}`);
    this.name = "AiRefusalError";
  }
}

let client: Anthropic | null = null;

/** Server-only Anthropic client. The API key never leaves the server. */
export function getAnthropic(): Anthropic {
  if (!isAiConfigured()) throw new AiNotConfiguredError();
  client ??= new Anthropic({ apiKey: env().ANTHROPIC_API_KEY, maxRetries: 2, timeout: 5 * 60_000 });
  return client;
}

/**
 * Server-side refusal fallback: when enabled, the API re-runs a declined
 * request on an appropriate fallback model instead of returning a refusal.
 */
export function fallbackOptions(): { betas: Anthropic.Beta.AnthropicBeta[]; fallbacks?: "default" } {
  return env().ANTHROPIC_FALLBACKS === "default"
    ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }
    : { betas: [] };
}

/** Maps SDK errors to messages that are safe and useful to show in the UI. */
export function describeAiError(err: unknown): string {
  if (err instanceof AiNotConfiguredError || err instanceof AiRefusalError) return err.message;
  if (err instanceof Anthropic.AuthenticationError) return "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.";
  if (err instanceof Anthropic.PermissionDeniedError) return "This API key is not allowed to use the configured model.";
  if (err instanceof Anthropic.NotFoundError) return `Model "${env().ANTHROPIC_MODEL}" was not found. Check ANTHROPIC_MODEL.`;
  if (err instanceof Anthropic.RateLimitError) return "Rate limited by the Anthropic API. Wait a moment and try again.";
  if (err instanceof Anthropic.BadRequestError) return `The AI request was rejected: ${err.message}`;
  if (err instanceof Anthropic.InternalServerError) return "The AI service had a temporary problem. Try again.";
  if (err instanceof Anthropic.APIConnectionError) return "Could not reach the Anthropic API. Check your network connection.";
  if (err instanceof Anthropic.APIError) return `AI request failed (${err.status ?? "unknown"}).`;
  return err instanceof Error ? err.message : "AI request failed.";
}
