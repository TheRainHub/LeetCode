"use client";

import { Code2, Flag, Lightbulb, Loader2, RotateCcw, Send, Timer, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { abandonInterviewAction } from "@/app/interviews/actions";
import { Markdown } from "@/components/content/markdown-client";
import { CodeEditor } from "@/components/practice/code-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Textarea } from "@/components/ui/input";
import { displayCandidateMessage } from "@/lib/ai/interviewer";
import type { Language } from "@/lib/content/types";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  kind: "normal" | "hint_request" | "opening";
  content: string;
}

type Body = { action: "start" } | { action: "retry" } | { action: "send"; kind: "normal" | "hint_request"; text: string; code: { language: string; code: string } | null };

export function InterviewSession({
  interviewId,
  startedAt,
  durationMinutes,
  language,
  initialMessages,
  lastError,
  theme,
}: {
  interviewId: number;
  startedAt: string;
  durationMinutes: number;
  language: Language;
  initialMessages: ChatMessage[];
  lastError: string | null;
  theme: "dark" | "light";
}) {
  const { m } = useI18n();
  const S = m.interviews.session;
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(lastError);
  const [text, setText] = useState("");
  const [code, setCode] = useState("");
  const [attach, setAttach] = useState(false);
  const [showCode, setShowCode] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [evaluating, setEvaluating] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming]);

  const call = useCallback(
    async (body: Body, optimistic?: ChatMessage) => {
      setBusy(true);
      setError(null);
      if (optimistic) setMessages((ms) => [...ms, optimistic]);
      setStreaming("");
      let acc = "";
      try {
        const res = await fetch(`/api/interviews/${interviewId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok || !res.body) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? `Request failed (${res.status})`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line) continue;
            const ev = JSON.parse(line) as { type: "delta"; text: string } | { type: "done" } | { type: "error"; message: string };
            if (ev.type === "delta") {
              acc += ev.text;
              setStreaming(acc);
            } else if (ev.type === "error") {
              throw new Error(ev.message);
            }
          }
        }
        if (acc.trim()) setMessages((ms) => [...ms, { id: `a-${Date.now()}`, role: "assistant", kind: "normal", content: acc.trim() }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setStreaming(null);
        setBusy(false);
      }
    },
    [interviewId],
  );

  // Ask the interviewer for the opening question once (the timer cleanup also absorbs StrictMode's double effect run).
  useEffect(() => {
    if (started.current || initialMessages.some((x) => x.role === "assistant") || lastError) return;
    const t = window.setTimeout(() => {
      started.current = true;
      void call({ action: "start" });
    }, 0);
    return () => window.clearTimeout(t);
  }, [call, initialMessages, lastError]);

  const send = (kind: "normal" | "hint_request") => {
    if (busy) return;
    const codePayload = attach && code.trim() ? { language, code } : null;
    if (kind === "normal" && !text.trim() && !codePayload) return;
    const display = [kind === "hint_request" ? `💡 ${S.hint}` : "", text.trim(), codePayload ? `\`\`\`${language}\n${code.trim()}\n\`\`\`` : ""]
      .filter(Boolean)
      .join("\n\n");
    void call({ action: "send", kind, text, code: codePayload }, { id: `u-${Date.now()}`, role: "user", kind, content: display });
    setText("");
    setAttach(false);
  };

  const end = async () => {
    if (!window.confirm(S.endConfirm)) return;
    setEvaluating(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/evaluate`, { method: "POST" });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Evaluation failed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      setEvaluating(false);
    }
  };

  const elapsedSec = (now - new Date(startedAt).getTime()) / 1000;
  const remaining = durationMinutes * 60 - elapsedSec;
  const mm = (s: number) => `${Math.floor(Math.abs(s) / 60)}:${String(Math.floor(Math.abs(s) % 60)).padStart(2, "0")}`;
  const visible = messages.filter((x) => x.kind !== "opening");
  const lastIsUser = messages.length > 0 && messages[messages.length - 1]!.role === "user";

  return (
    <div className="flex h-[calc(100dvh-0px)] flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface px-4">
        <span className={cn("flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs tabular-nums", remaining < 0 ? "border-danger/40 text-danger" : remaining < 300 ? "border-warning/40 text-warning" : "border-border text-muted-foreground")}>
          <Timer className="size-3.5" />
          {remaining >= 0 ? `${S.remaining} ${mm(remaining)}` : `${S.overtime} ${mm(remaining)}`}
        </span>
        <Button size="sm" variant="ghost" onClick={() => setShowCode((s) => !s)} aria-pressed={showCode}>
          <Code2 />
          {S.codePanel}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              if (!window.confirm(S.abandonConfirm)) return;
              await abandonInterviewAction({ id: interviewId });
              router.push("/interviews");
            }}
          >
            <X />
            {S.abandon}
          </Button>
          <Button size="sm" variant="primary" onClick={end} disabled={busy || evaluating} data-testid="end-interview">
            {evaluating ? <Loader2 className="animate-spin" /> : <Flag />}
            {evaluating ? S.evaluating : S.end}
          </Button>
        </div>
      </header>
      {remaining < 0 ? <div className="bg-warning-soft px-4 py-1.5 text-xs text-warning">{S.timeUp}</div> : null}

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {visible.length === 0 && busy ? <p className="text-sm text-muted-foreground">{S.starting}</p> : null}
              {visible.map((msg) => (
                <div key={msg.id} className={cn("flex flex-col gap-1", msg.role === "user" && "items-end")}>
                  <span className="text-[11px] text-subtle-foreground">
                    {msg.role === "assistant" ? S.interviewer : S.you}
                    {msg.kind === "hint_request" ? (
                      <Badge tone="warning" className="ml-1.5">
                        {S.hint}
                      </Badge>
                    ) : null}
                  </span>
                  <div className={cn("max-w-[92%] rounded-lg px-3.5 py-2.5", msg.role === "assistant" ? "border border-border bg-surface" : "bg-primary-soft")}>
                    <Markdown compact>{msg.role === "user" ? displayCandidateMessage(msg.content) : msg.content}</Markdown>
                  </div>
                </div>
              ))}
              {streaming !== null ? (
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-subtle-foreground">{S.interviewer}</span>
                  <div className="max-w-[92%] rounded-lg border border-border bg-surface px-3.5 py-2.5">
                    {streaming ? (
                      <Markdown compact>{streaming}</Markdown>
                    ) : (
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" />
                        {S.thinking}
                      </span>
                    )}
                  </div>
                </div>
              ) : null}
              {error ? (
                <div className="flex items-center gap-3 rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
                  <span className="flex-1">{error}</span>
                  {lastIsUser ? (
                    <Button size="sm" variant="ghost" onClick={() => void call({ action: messages.some((x) => x.role === "user") ? "retry" : "start" })} disabled={busy}>
                      <RotateCcw />
                      {S.retry}
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <div ref={bottom} />
            </div>
          </div>
          <div className="border-t border-border bg-surface px-4 py-3">
            <div className="mx-auto flex max-w-3xl flex-col gap-2">
              <Textarea
                rows={3}
                value={text}
                disabled={busy || evaluating}
                placeholder={S.placeholder}
                aria-label={S.placeholder}
                data-testid="interview-input"
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send("normal");
                  }
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Checkbox checked={attach} onChange={(e) => setAttach(e.target.checked)} disabled={!code.trim()} />
                  {S.attachCode}
                </label>
                <span className="text-[11px] text-subtle-foreground">{S.notExecuted}</span>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => send("hint_request")} disabled={busy || evaluating} title={S.hintNote}>
                    <Lightbulb />
                    {S.hint}
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => send("normal")} disabled={busy || evaluating || (!text.trim() && !(attach && code.trim()))} data-testid="interview-send">
                    <Send />
                    {S.send}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {showCode ? (
          <aside className="hidden w-[44%] min-w-80 border-l border-border lg:block">
            <CodeEditor path={`file:///interview-${interviewId}/answer.${language === "typescript" ? "ts" : language === "python" ? "py" : "java"}`} language={language} value={code} onChange={setCode} theme={theme} />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
