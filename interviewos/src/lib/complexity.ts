/**
 * Normalizes Big-O expressions so a learner's claim can be compared with the
 * expected complexity: "O(N log N)", "o(nlogn)", "n * log(n)" → "nlogn".
 */
export function normalizeComplexity(input: string): string {
  let s = input.trim().toLowerCase();
  s = s.replace(/^o\s*\(/, "").replace(/\)\s*$/, "");
  s = s.replace(/\s+/g, "").replace(/[*·×]/g, "");
  s = s.replace(/log\((\w+)\)/g, "log$1");
  s = s.replace(/\^/g, "").replace(/²/g, "2");
  s = s.replace(/^\((.*)\)$/, "$1");
  return s;
}

export function complexityMatches(claimed: string, expected: string): boolean {
  if (!claimed.trim()) return false;
  return normalizeComplexity(claimed) === normalizeComplexity(expected);
}

export const COMMON_COMPLEXITIES = ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n log k)", "O(n²)", "O(m·n)", "O(n·k)", "O(n·k log k)", "O(2ⁿ)"];
