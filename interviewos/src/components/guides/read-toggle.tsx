"use client";

import { Check, Circle } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setGuideReadAction } from "@/app/practice/system-design/guides/actions";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

export function GuideReadToggle({ slug, read }: { slug: string; read: boolean }) {
  const { m } = useI18n();
  const G = m.sd.guides;
  const [value, setValue] = useState(read);
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={value ? "secondary" : "primary"}
      disabled={pending}
      title={G.readHelp}
      data-testid="guide-read-toggle"
      aria-pressed={value}
      onClick={() =>
        start(async () => {
          const next = !value;
          setValue(next);
          const res = await setGuideReadAction({ slug, read: next });
          if (!res.ok) {
            setValue(!next);
            toast.error(res.error);
          }
        })
      }
    >
      {value ? <Check className="text-success" /> : <Circle />}
      {value ? G.markedRead : G.markRead}
    </Button>
  );
}
