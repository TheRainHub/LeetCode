import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Messages } from "@/lib/i18n";
import { bankHref, DEFAULT_BANK_FILTERS } from "@/lib/problem-bank/filters";
import type { getCompanyBankSummary } from "@/server/bank";
import { BankTable } from "./bank-table";

type Summary = Awaited<ReturnType<typeof getCompanyBankSummary>>;

/** Company page card: most frequently reported LeetCode problems from the imported company lists. */
export function CompanyBankCard({
  summary,
  m,
  className,
}: {
  summary: Summary;
  m: Messages;
  className?: string;
}) {
  const C = m.bank.companyCard;
  return (
    <Card className={className} data-testid="company-bank">
      <CardHeader>
        <div>
          <CardTitle>{C.title}</CardTitle>
          {summary && summary.total ? (
            <CardDescription>
              {C.description(m.bank.filters.windows[summary.window])} ·{" "}
              {C.solved(summary.solved, summary.total)}
            </CardDescription>
          ) : null}
        </div>
        <Link
          href={
            summary
              ? bankHref(DEFAULT_BANK_FILTERS, { company: summary.companySlug, window: summary.window })
              : "/practice/bank"
          }
          className="text-primary shrink-0 text-xs hover:underline"
        >
          {summary && summary.total ? C.seeAll(summary.total) : C.browse} →
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {summary && summary.rows.length ? (
          <div className="overflow-x-auto">
            <BankTable rows={summary.rows} m={m} metric="frequency" compact />
          </div>
        ) : (
          <p className="text-muted-foreground px-4 pb-4 text-xs">{C.notInDataset}</p>
        )}
      </CardContent>
    </Card>
  );
}
