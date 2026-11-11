import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getI18n } from "@/server/user";

export type PracticeTab = "problems" | "labs" | "review" | "bank" | "patterns";

const HREF: Record<PracticeTab, string> = {
  problems: "/practice?tab=problems",
  labs: "/practice?tab=labs",
  review: "/practice?tab=review",
  bank: "/practice/bank",
  patterns: "/practice/patterns",
};

export async function PracticeTabs({ current, reviewDue = 0 }: { current: PracticeTab; reviewDue?: number }) {
  const { m } = await getI18n();
  const label: Record<PracticeTab, string> = { ...m.practice.tabs, ...m.bank.tabs };
  return (
    <nav
      className="border-border bg-surface-2 mb-4 inline-flex flex-wrap gap-0.5 rounded-md border p-0.5"
      aria-label={m.practice.title}
    >
      {(Object.keys(HREF) as PracticeTab[]).map((t) => (
        <Link
          key={t}
          href={HREF[t]}
          aria-current={current === t ? "page" : undefined}
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-[5px] px-3 text-xs font-medium",
            current === t
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label[t]}
          {t === "review" && reviewDue > 0 ? <Badge tone="primary">{reviewDue}</Badge> : null}
        </Link>
      ))}
    </nav>
  );
}
