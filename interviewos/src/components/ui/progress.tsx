import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  tone = "primary",
  label,
}: {
  /** 0..100 */
  value: number;
  className?: string;
  tone?: "primary" | "success" | "warning" | "danger" | "muted";
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const color = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    muted: "bg-subtle-foreground",
  }[tone];
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      aria-label={label}
      className={cn("bg-surface-3 h-1.5 w-full overflow-hidden rounded-full", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", color)}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}
