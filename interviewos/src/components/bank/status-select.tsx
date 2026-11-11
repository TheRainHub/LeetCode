"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setBankStatusAction } from "@/app/practice/bank/actions";
import { useI18n } from "@/lib/i18n/client";
import { BANK_STATUSES, type BankStatus } from "@/lib/problem-bank/filters";
import { cn } from "@/lib/utils";

const TONE: Record<BankStatus | "none", string> = {
  none: "text-muted-foreground",
  planned: "text-primary",
  attempted: "text-warning",
  solved: "text-success",
  solved_with_help: "text-success",
};

/** Self-reported status picker for a problem bank entry. */
export function BankStatusSelect({
  problemId,
  title,
  status,
}: {
  problemId: number;
  title: string;
  status: BankStatus | null;
}) {
  const { m } = useI18n();
  const [value, setValue] = useState<BankStatus | "none">(status ?? "none");
  const [pending, start] = useTransition();
  return (
    <select
      aria-label={m.bank.statusLabel(title)}
      data-testid={`bank-status-${problemId}`}
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as BankStatus | "none";
        const previous = value;
        setValue(next);
        start(async () => {
          const res = await setBankStatusAction({ problemId, status: next === "none" ? null : next });
          if (!res.ok) {
            setValue(previous);
            toast.error(res.error);
          }
        });
      }}
      className={cn(
        "border-border bg-surface h-7 w-full max-w-40 rounded-md border px-1.5 text-xs disabled:opacity-60",
        TONE[value],
      )}
    >
      <option value="none">{m.bank.status.none}</option>
      {BANK_STATUSES.map((s) => (
        <option key={s} value={s}>
          {m.bank.status[s]}
        </option>
      ))}
    </select>
  );
}
