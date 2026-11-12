import Link from "next/link";
import { cn } from "@/lib/utils";

type SubnavKey = "questions" | "whiteboard" | "guides";

/** Switch between the question catalogue, the whiteboard sandbox and the visual guides library. */
export function SdSubnav({
  current,
  labels,
  guideCount,
}: {
  current: SubnavKey;
  labels: Record<SubnavKey, string>;
  guideCount?: number;
}) {
  const item = (key: SubnavKey, href: string, label: string) => (
    <Link
      href={href}
      aria-current={current === key ? "page" : undefined}
      className={cn(
        "border-b-2 px-1 pb-1.5 text-sm",
        current === key
          ? "border-primary text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground border-transparent",
      )}
    >
      {label}
    </Link>
  );
  return (
    <nav className="border-border mb-4 flex gap-4 border-b" data-testid="sd-subnav">
      {item("questions", "/practice/system-design", labels.questions)}
      {item("whiteboard", "/practice/system-design/whiteboard", labels.whiteboard)}
      {item(
        "guides",
        "/practice/system-design/guides",
        guideCount ? `${labels.guides} (${guideCount})` : labels.guides,
      )}
    </nav>
  );
}
