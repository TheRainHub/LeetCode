"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

export function EvaluationRetry({ interviewId, error }: { interviewId: number; error: string | null }) {
  const { m } = useI18n();
  const S = m.interviews.session;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(error);
  return (
    <div className="border-border bg-surface flex flex-col items-start gap-3 rounded-lg border p-5">
      {err ? (
        <p className="text-danger text-sm" role="alert">
          {S.evaluationFailed}: {err}
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">{S.evaluating}</p>
      )}
      <Button
        variant="primary"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          const res = await fetch(`/api/interviews/${interviewId}/evaluate`, { method: "POST" });
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          if (!res.ok) setErr(j.error ?? "Evaluation failed");
          setBusy(false);
          router.refresh();
        }}
      >
        {busy ? <Loader2 className="animate-spin" /> : <RotateCcw />}
        {S.retryEvaluation}
      </Button>
    </div>
  );
}
