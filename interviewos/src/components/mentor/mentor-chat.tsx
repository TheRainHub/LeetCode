"use client";

import { Brain, CheckCircle2, ClipboardList, Loader2, RotateCcw, Send, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createMentorThreadAction } from "@/app/mentor/actions";
import { Markdown } from "@/components/content/markdown-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export interface ChatTool {
  name: string;
  ok?: boolean;
  summary: string;
}
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  tools: ChatTool[];
}

type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "tool"; name: string; ok: boolean; summary: string }
  | { type: "done" }
  | { type: "error"; message: string };

const TOOL_ICON: Record<string, typeof ClipboardList> = {
  assign_task: ClipboardList,
  update_task: CheckCircle2,
  remember: Brain,
  forget: Brain,
};

export function MentorChat({
  threadId,
  initialMessages,
  enabled,
  full,
  lastError,
}: {
  threadId: number | null;
  initialMessages: ChatMessage[];
  enabled: boolean;
  full: boolean;
  lastError: string | null;
}) {
  const { m } = useI18n();
  const M = m.mentor;
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(lastError);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const stream = async (id: number, body: { action: "send"; text: string } | { action: "retry" }) => {
    const assistantId = `stream-${Date.now()}`;
    setMessages((ms) => [...ms, { id: assistantId, role: "assistant", content: "", tools: [] }]);
    const patch = (f: (msg: ChatMessage) => ChatMessage) =>
      setMessages((ms) => ms.map((x) => (x.id === assistantId ? f(x) : x)));
    const res = await fetch(`/api/mentor/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok || !res.body) {
      const err = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(err?.error ?? `HTTP ${res.status}`);
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
        const raw = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!raw) continue;
        const ev = JSON.parse(raw) as StreamEvent;
        if (ev.type === "delta") patch((x) => ({ ...x, content: x.content + ev.text }));
        if (ev.type === "tool")
          patch((x) => ({ ...x, tools: [...x.tools, { name: ev.name, ok: ev.ok, summary: ev.summary }] }));
        if (ev.type === "error") setError(ev.message);
      }
    }
  };

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setError(null);
    setDraft("");
    setMessages((ms) => [...ms, { id: `user-${Date.now()}`, role: "user", content: t, tools: [] }]);
    try {
      const id = threadId ?? (await createMentorThreadAction({ title: t })).id;
      await stream(id, { action: "send", text: t });
      if (threadId === null) router.replace(`/mentor?thread=${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const retry = async () => {
    if (!threadId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await stream(threadId, { action: "retry" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="mentor-chat">
      <div className="min-h-0 flex-1 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-xl flex-col gap-3 py-8 text-center">
            <p className="text-muted-foreground text-sm">{M.empty}</p>
            <div className="flex flex-col gap-2">
              {M.starters.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={!enabled || busy}
                  onClick={() => void send(s)}
                  className="border-border hover:border-primary hover:bg-surface-2 rounded-md border px-3 py-2 text-left text-sm disabled:opacity-50"
                  data-testid="mentor-starter"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {messages.map((msg) => (
              <li
                key={msg.id}
                className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                data-testid={`mentor-msg-${msg.role}`}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2",
                    msg.role === "user" ? "bg-primary-soft text-sm whitespace-pre-wrap" : "bg-surface-2",
                  )}
                >
                  {msg.role === "user" ? (
                    msg.content
                  ) : msg.content ? (
                    <Markdown compact>{msg.content}</Markdown>
                  ) : busy ? (
                    <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      {M.thinking}
                    </span>
                  ) : null}
                  {msg.tools.length ? (
                    <ul className="mt-2 flex flex-col gap-1">
                      {msg.tools.map((t, i) => {
                        const Icon = t.ok === false ? XCircle : (TOOL_ICON[t.name] ?? ClipboardList);
                        return (
                          <li
                            key={i}
                            className={cn(
                              "border-border bg-surface flex items-start gap-1.5 rounded border px-2 py-1 text-xs",
                              t.ok === false && "text-muted-foreground",
                            )}
                            data-testid="mentor-tool"
                            data-tool={t.name}
                          >
                            <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                            <span>
                              <span className="font-medium">
                                {M.tools[t.name as keyof typeof M.tools] ?? t.name}
                                {t.ok === false ? ` (${M.rejected})` : ""}:
                              </span>{" "}
                              {t.summary}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div ref={bottom} />
      </div>

      {error ? (
        <div
          className="text-danger flex items-center gap-2 border-t px-4 py-2 text-xs"
          role="alert"
          data-testid="mentor-error"
        >
          <span className="flex-1">{M.failed(error)}</span>
          {threadId ? (
            <Button size="sm" variant="ghost" onClick={() => void retry()} disabled={busy}>
              <RotateCcw />
              {M.retry}
            </Button>
          ) : null}
        </div>
      ) : null}

      <form
        className="border-border flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        {full ? (
          <p className="text-muted-foreground flex-1 text-sm">{M.full}</p>
        ) : (
          <>
            <Textarea
              rows={2}
              className="min-h-0 flex-1 resize-none"
              placeholder={M.placeholder}
              value={draft}
              maxLength={8000}
              disabled={!enabled}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send(draft);
                }
              }}
              aria-label={M.placeholder}
              data-testid="mentor-input"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!enabled || busy || !draft.trim()}
              data-testid="mentor-send"
            >
              {busy ? <Loader2 className="animate-spin" /> : <Send />}
              {M.send}
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
