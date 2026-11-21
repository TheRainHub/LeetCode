"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { saveFoundJobAction } from "@/app/jobs/actions";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

export function SaveFoundJob({
  searchId,
  index,
  savedId,
}: {
  searchId: number;
  index: number;
  savedId: number | null;
}) {
  const { m } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  if (savedId)
    return (
      <Button asChild size="sm" variant="ghost">
        <Link href={`/jobs/${savedId}`} data-testid="found-open">
          <Check />
          {m.jobs.find.saved}
        </Link>
      </Button>
    );
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      data-testid="found-save"
      onClick={() =>
        start(async () => {
          const res = await saveFoundJobAction({ searchId, index });
          if (!res.ok) toast.error(res.error);
          router.refresh();
        })
      }
    >
      <Plus />
      {m.jobs.find.save}
    </Button>
  );
}
