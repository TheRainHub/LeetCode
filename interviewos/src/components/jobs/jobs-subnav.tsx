import Link from "next/link";
import { cn } from "@/lib/utils";

type Key = "overview" | "find" | "profile";
const HREF: Record<Key, string> = { overview: "/jobs", find: "/jobs/find", profile: "/jobs/profile" };

export function JobsSubnav({ current, labels }: { current: Key; labels: Record<Key, string> }) {
  return (
    <nav className="border-border mb-4 flex gap-4 border-b" data-testid="jobs-subnav">
      {(Object.keys(HREF) as Key[]).map((key) => (
        <Link
          key={key}
          href={HREF[key]}
          aria-current={current === key ? "page" : undefined}
          className={cn(
            "border-b-2 px-1 pb-1.5 text-sm",
            current === key
              ? "border-primary text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground border-transparent",
          )}
        >
          {labels[key]}
        </Link>
      ))}
    </nav>
  );
}
