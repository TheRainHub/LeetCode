/** Compact rates for nodes and labels: 950, 1.2k, 15k, 1.5M. */
export function fmtRate(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  const a = Math.abs(n);
  if (a >= 1e6) return `${trim(n / 1e6, a < 1e7 ? 1 : 0)}M`;
  if (a >= 1e3) return `${trim(n / 1e3, a < 1e4 ? 1 : 0)}k`;
  if (a >= 10 || a === 0) return String(Math.round(n));
  return trim(n, 1);
}

const trim = (n: number, digits: number) => String(Number(n.toFixed(digits)));

/** Utilisation or share as a percentage; keeps one decimal near the edges (99.5 %, 0.4 %). */
export function fmtPct(share: number): string {
  if (!Number.isFinite(share)) return "∞";
  const p = share * 100;
  if (p >= 10_000) return ">9999%";
  if (p >= 1000) return `${Math.round(p)}%`;
  const digits = (p > 0 && p < 1) || (p > 99 && p < 100) ? 1 : 0;
  return `${trim(p, digits)}%`;
}

export function fmtMs(ms: number): string {
  if (ms >= 1000) return `${trim(ms / 1000, 1)} s`;
  return `${trim(ms, ms < 10 ? 1 : 0)} ms`;
}
