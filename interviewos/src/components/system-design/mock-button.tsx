"use client";

import { Loader2, MessagesSquare } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { startSdInterviewAction } from "@/app/practice/system-design/actions";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

export function SdMockButton({ slug, enabled }: { slug: string; enabled: boolean }) {
  const { m } = useI18n();
  const [pending, start] = useTransition();
  if (!enabled) return <p className="text-muted-foreground text-xs">{m.sd.ws.mock.disabled}</p>;
  return (
    <Button
      variant="primary"
      size="sm"
      disabled={pending}
      data-testid="sd-start-mock"
      onClick={() =>
        start(async () => {
          const res = await startSdInterviewAction({ slug });
          if (res && !res.ok) toast.error(res.error);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <MessagesSquare />}
      {m.sd.ws.mock.start}
    </Button>
  );
}
