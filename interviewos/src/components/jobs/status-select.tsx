"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { setPostingStatusAction } from "@/app/jobs/actions";
import { Select } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import { JOB_STATUSES, type JobStatus } from "@/lib/jobs/model";

export function StatusSelect({ id, status, compact }: { id: number; status: JobStatus; compact?: boolean }) {
  const { m } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Select
      className={compact ? "h-7 w-36 text-xs" : "w-44"}
      value={status}
      disabled={pending}
      aria-label={m.jobs.posting.statusLabel}
      data-testid="posting-status"
      onChange={(e) =>
        start(async () => {
          const res = await setPostingStatusAction({ id, status: e.target.value });
          if (!res.ok) toast.error(res.error);
          router.refresh();
        })
      }
    >
      {JOB_STATUSES.map((s) => (
        <option key={s} value={s}>
          {m.jobs.status[s]}
        </option>
      ))}
    </Select>
  );
}
