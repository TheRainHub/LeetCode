import { CheckCircle2, CircleDashed, CircleDot } from "lucide-react";
import type { SdStatus } from "@/lib/system-design/status";

/** Status icon. Pass `decorative` when the label is already shown as visible text next to it. */
export function SdStatusIcon({
  status,
  label,
  decorative = false,
}: {
  status: SdStatus;
  label: string;
  decorative?: boolean;
}) {
  const icon =
    status === "strong" ? (
      <CheckCircle2 className="text-success size-4" />
    ) : status === "practiced" ? (
      <CheckCircle2 className="text-primary size-4" />
    ) : status === "drafted" ? (
      <CircleDot className="text-warning size-4" />
    ) : (
      <CircleDashed className="text-subtle-foreground size-4" />
    );
  return (
    <span
      title={decorative ? undefined : label}
      data-status={status}
      className="inline-flex"
      aria-hidden={decorative || undefined}
    >
      {icon}
      {decorative ? null : <span className="sr-only">{label}</span>}
    </span>
  );
}
