import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { GuideCard } from "@/server/guides";

/** Compact list of guides for side cards (lesson and question pages). */
export function GuideList({ guides, readLabel }: { guides: GuideCard[]; readLabel: string }) {
  return (
    <ul className="flex flex-col gap-1.5" data-testid="guide-list">
      {guides.map((g) => (
        <li key={g.slug} className="flex items-start gap-2 text-xs">
          {g.read ? (
            <CheckCircle2 className="text-success mt-0.5 size-3.5 shrink-0" aria-label={readLabel} />
          ) : (
            <span className="bg-border mt-1.5 size-1.5 shrink-0 rounded-full" aria-hidden />
          )}
          <Link href={`/practice/system-design/guides/${g.slug}`} className="hover:text-primary">
            {g.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}
