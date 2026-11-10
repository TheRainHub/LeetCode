"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addCardAction } from "@/app/practice/review/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";

export function AddCardDialog({ topics }: { topics: { id: number; title: string }[] }) {
  const { m } = useI18n();
  const R = m.review;
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [topic, setTopic] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          {R.addCard}
        </Button>
      </DialogTrigger>
      <DialogContent title={R.addCard}>
        <div className="flex flex-col gap-3">
          <Field label={R.prompt} htmlFor="card-prompt">
            <Textarea id="card-prompt" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </Field>
          <Field label={R.answer} htmlFor="card-answer">
            <Textarea id="card-answer" rows={4} value={answer} onChange={(e) => setAnswer(e.target.value)} />
          </Field>
          <Field label={R.topicOptional} htmlFor="card-topic">
            <Select id="card-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">—</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            variant="primary"
            className="self-start"
            disabled={pending || prompt.trim().length < 3 || !answer.trim()}
            onClick={() =>
              start(async () => {
                const res = await addCardAction({ prompt, answer, topicId: topic ? Number(topic) : null });
                if (!res.ok) return void toast.error(res.error);
                toast.success(R.cardAdded);
                setPrompt("");
                setAnswer("");
                setOpen(false);
              })
            }
          >
            {m.common.actions.add}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
