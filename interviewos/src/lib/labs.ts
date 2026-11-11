import type { LabStep } from "@/lib/content/types";

export const MIN_REFLECTION_CHARS = 80;
const DEFAULT_MIN_PASTE = 20;

/**
 * Checks pasted evidence against a step's verification rule. Patterns are
 * case-insensitive; a leading "(?i)" (PCRE style) is accepted and ignored.
 */
export function checkStepEvidence(
  step: LabStep,
  evidence: { text?: string; checked?: boolean },
): { passed: boolean; reason?: "short" | "pattern" | "unchecked" } {
  const v = step.verification;
  if (v.kind === "checkbox")
    return evidence.checked ? { passed: true } : { passed: false, reason: "unchecked" };
  const text = (evidence.text ?? "").trim();
  const min = v.minLength ?? DEFAULT_MIN_PASTE;
  if (text.length < min) return { passed: false, reason: "short" };
  if (v.pattern) {
    const source = v.pattern.replace(/^\(\?i\)/, "");
    if (!new RegExp(source, "i").test(text)) return { passed: false, reason: "pattern" };
  }
  return { passed: true };
}
