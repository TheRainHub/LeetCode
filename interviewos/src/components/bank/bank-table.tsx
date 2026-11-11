import { ExternalLink, PlayCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Messages } from "@/lib/i18n";
import { bankHref, DEFAULT_BANK_FILTERS } from "@/lib/problem-bank/filters";
import type { BankRow } from "@/server/bank";
import { BankStatusSelect } from "./status-select";

const DIFFICULTY_TONE = { easy: "success", medium: "warning", hard: "danger" } as const;

export function DifficultyBadge({ difficulty, m }: { difficulty: BankRow["difficulty"]; m: Messages }) {
  return difficulty ? (
    <Badge tone={DIFFICULTY_TONE[difficulty]}>{m.common.difficulty[difficulty]}</Badge>
  ) : (
    <Badge tone="outline">{m.bank.unknownDifficulty}</Badge>
  );
}

function FrequencyBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="bg-surface-3 h-1.5 w-16 overflow-hidden rounded-full" aria-hidden>
        <div
          className="bg-primary h-full rounded-full"
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>
      <span className="text-muted-foreground w-9 text-right text-[11px] tabular-nums">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

/**
 * Bank listing. `metric` picks the numeric column: per-company frequency, the
 * number of companies asking it, or nothing (compact cards).
 */
export function BankTable({
  rows,
  m,
  metric,
  compact = false,
}: {
  rows: BankRow[];
  m: Messages;
  metric: "frequency" | "companies" | "none";
  compact?: boolean;
}) {
  const B = m.bank;
  return (
    <table className="w-full text-sm" data-testid="bank-table">
      <thead className="border-border bg-surface-2 text-muted-foreground border-b text-left text-[11px]">
        <tr>
          <th className="px-3 py-2 font-medium">{B.columns.problem}</th>
          <th className="px-3 py-2 font-medium">{B.columns.difficulty}</th>
          {metric !== "none" ? (
            <th
              className="hidden px-3 py-2 font-medium sm:table-cell"
              title={metric === "frequency" ? B.frequencyHelp : B.companiesHelp}
            >
              {metric === "frequency" ? B.columns.frequency : B.columns.companies}
            </th>
          ) : null}
          <th className="w-36 px-3 py-2 font-medium">{B.columns.status}</th>
        </tr>
      </thead>
      <tbody className="divide-border divide-y">
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-surface-2 align-top" data-testid="bank-row" data-slug={r.slug}>
            <td className="px-3 py-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:text-primary inline-flex items-center gap-1 font-medium"
                  title={B.openOnLeetCode}
                >
                  {r.title}
                  <ExternalLink className="text-subtle-foreground size-3" aria-hidden />
                </a>
                {r.internalSlug ? (
                  <Link
                    href={`/practice/problems/${r.internalSlug}`}
                    className="text-primary inline-flex items-center gap-1 text-[11px] hover:underline"
                    title={B.solveHereHelp}
                  >
                    <PlayCircle className="size-3" aria-hidden />
                    {B.solveHere}
                  </Link>
                ) : null}
              </div>
              {!compact && (r.patterns.length || r.tags.length) ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {r.patterns.map((p) => (
                    <Link
                      key={p.slug}
                      href={bankHref(DEFAULT_BANK_FILTERS, { pattern: p.slug })}
                      title={B.filters.pattern}
                    >
                      <Badge tone="primary">{p.name}</Badge>
                    </Link>
                  ))}
                  {r.tags.slice(0, 4).map((t) => (
                    <Link key={t} href={bankHref(DEFAULT_BANK_FILTERS, { tag: t })} title={B.filters.tag}>
                      <Badge tone="neutral">{t}</Badge>
                    </Link>
                  ))}
                  {r.tags.length > 4 ? (
                    <span className="text-subtle-foreground text-[11px]">+{r.tags.length - 4}</span>
                  ) : null}
                </div>
              ) : null}
            </td>
            <td className="px-3 py-2">
              <DifficultyBadge difficulty={r.difficulty} m={m} />
            </td>
            {metric !== "none" ? (
              <td className="hidden px-3 py-2 sm:table-cell">
                {metric === "frequency" && r.frequency !== null ? (
                  <FrequencyBar value={r.frequency} />
                ) : (
                  <span className="text-muted-foreground text-xs tabular-nums">{r.companyCount}</span>
                )}
              </td>
            ) : null}
            <td className="px-3 py-2">
              <BankStatusSelect problemId={r.id} title={r.title} status={r.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
