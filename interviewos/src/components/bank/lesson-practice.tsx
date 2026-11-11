import { VISUALIZATIONS } from "@content/problem-bank";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { Messages } from "@/lib/i18n";
import { bankHref, DEFAULT_BANK_FILTERS } from "@/lib/problem-bank/filters";
import type { BankRow } from "@/server/bank";
import { BankTable } from "./bank-table";
import { VisualizationLinks } from "./visualizations";

/** Lesson add-on: most asked LeetCode problems for the topic and algorithm visualizations. */
export function LessonBankPractice({
  lesson,
  practice,
  m,
}: {
  lesson: string;
  practice: { rows: BankRow[]; total: number };
  m: Messages;
}) {
  const C = m.bank.lessonCard;
  const hasVisuals = Boolean(VISUALIZATIONS[lesson]?.length);
  if (!practice.total && !hasVisuals) return null;
  return (
    <div className="mt-6 flex flex-col gap-4" data-testid="lesson-bank">
      {practice.total ? (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-3 pb-2">
            <div>
              <p className="text-sm font-medium">{C.title}</p>
              <p className="text-muted-foreground text-xs">{C.description}</p>
            </div>
            <Link
              href={bankHref(DEFAULT_BANK_FILTERS, { lesson })}
              className="text-primary text-xs hover:underline"
            >
              {C.seeAll(practice.total)} →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <BankTable rows={practice.rows} m={m} metric="companies" compact />
          </div>
        </Card>
      ) : null}
      {hasVisuals ? (
        <Card className="p-4">
          <p className="text-sm font-medium">{C.visualize}</p>
          <p className="text-muted-foreground mb-3 text-xs">{C.visualizeHelp}</p>
          <VisualizationLinks lesson={lesson} m={m} />
        </Card>
      ) : null}
    </div>
  );
}
