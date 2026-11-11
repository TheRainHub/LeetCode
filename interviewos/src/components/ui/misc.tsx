import * as React from "react";
import { cn } from "@/lib/utils";

export function Separator({ className, vertical }: { className?: string; vertical?: boolean }) {
  return (
    <div
      role="separator"
      aria-orientation={vertical ? "vertical" : "horizontal"}
      className={cn(vertical ? "h-full w-px" : "h-px w-full", "bg-border", className)}
    />
  );
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "border-border bg-surface-2 text-muted-foreground inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 font-mono text-[10px]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("bg-surface-3 animate-pulse rounded-md", className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center",
        className,
      )}
    >
      {icon ? <div className="text-subtle-foreground [&_svg]:size-5">{icon}</div> : null}
      <p className="text-foreground text-sm font-medium">{title}</p>
      {description ? (
        <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function NotEnoughData({ label, className }: { label: string; className?: string }) {
  return <span className={cn("text-subtle-foreground text-xs italic", className)}>{label}</span>;
}

export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">{label}</span>
      <span className="text-foreground text-xl font-semibold tabular-nums">{value}</span>
      {hint ? <span className="text-subtle-foreground text-[11px]">{hint}</span> : null}
    </div>
  );
}

export function SectionHeading({
  children,
  className,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("mb-2 flex items-center justify-between gap-2", className)}>
      <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{children}</h3>
      {action}
    </div>
  );
}
