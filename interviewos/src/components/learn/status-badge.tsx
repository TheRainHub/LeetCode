"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n/client";
import type { TopicStatus } from "@/lib/mastery/status";

const TONE: Record<TopicStatus, "neutral" | "primary" | "success" | "warning"> = {
  not_started: "neutral",
  learning: "neutral",
  practicing: "primary",
  needs_review: "warning",
  interview_ready: "success",
};

export function StatusBadge({ status, withHelp = true }: { status: TopicStatus; withHelp?: boolean }) {
  const { m } = useI18n();
  const badge = (
    <Badge tone={TONE[status]} data-status={status}>
      <span
        className={`size-1.5 rounded-full ${status === "not_started" ? "bg-subtle-foreground" : "bg-current"}`}
      />
      {m.common.status[status]}
    </Badge>
  );
  if (!withHelp) return badge;
  return (
    <Tooltip content={m.common.statusHelp[status]}>
      <span className="inline-flex">{badge}</span>
    </Tooltip>
  );
}
