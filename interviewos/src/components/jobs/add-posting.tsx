"use client";

import { Link2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { importPostingAction } from "@/app/jobs/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import { PostingForm } from "./posting-form";

export function AddPosting({ aiEnabled }: { aiEnabled: boolean }) {
  const { m } = useI18n();
  const O = m.jobs.overview;
  const router = useRouter();
  const [mode, setMode] = useState<"link" | "paste">(aiEnabled ? "link" : "paste");
  const [url, setUrl] = useState("");
  const [pending, start] = useTransition();

  const importFromLink = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await importPostingAction({ url: url.trim() });
      if (!res.ok || !res.data) {
        toast.error(res.ok ? "Error" : res.error);
        return;
      }
      router.push(`/jobs/${res.data.id}`);
    });
  };

  return (
    <div className="flex flex-col gap-3" data-testid="add-posting">
      <div className="flex gap-1" role="tablist">
        {aiEnabled ? (
          <Button
            size="sm"
            variant={mode === "link" ? "secondary" : "ghost"}
            onClick={() => setMode("link")}
            role="tab"
            aria-selected={mode === "link"}
          >
            {O.fromLink}
          </Button>
        ) : null}
        <Button
          size="sm"
          variant={mode === "paste" ? "secondary" : "ghost"}
          onClick={() => setMode("paste")}
          role="tab"
          aria-selected={mode === "paste"}
          data-testid="add-paste"
        >
          {O.paste}
        </Button>
      </div>
      {mode === "link" ? (
        <form onSubmit={importFromLink} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              type="url"
              required
              placeholder="https://"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              aria-label={m.jobs.form.url}
              data-testid="import-url"
            />
            <Button type="submit" variant="primary" size="md" disabled={pending} data-testid="import-submit">
              {pending ? <Loader2 className="animate-spin" /> : <Link2 />}
              {pending ? O.importing : O.import}
            </Button>
          </div>
          <p className="text-subtle-foreground text-[11px]">{O.fromLinkHelp}</p>
        </form>
      ) : (
        <PostingForm />
      )}
    </div>
  );
}
