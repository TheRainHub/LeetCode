import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { type ChatMessage, MentorChat } from "@/components/mentor/mentor-chat";
import { MentorNotes, MentorTasks, NewThreadButton } from "@/components/mentor/mentor-panels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAiConfigured } from "@/lib/ai/config";
import { MENTOR_MAX_MESSAGES, taskHref } from "@/lib/ai/mentor";
import { cn } from "@/lib/utils";
import { displayMessages, getThread, listMentorNotes, listMentorTasks, listThreads } from "@/server/mentor";
import { getI18n } from "@/server/user";

export const metadata = { title: "Mentor" };
// A reply can include several tool rounds.
export const maxDuration = 300;

const TOOL_SUMMARY_KEYS: Record<string, string> = {
  assign_task: "title",
  remember: "note",
  update_task: "status",
};

export default async function MentorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const requested = Number(typeof sp.thread === "string" ? sp.thread : NaN);
  const [{ m, locale }, threads, tasks, notes] = await Promise.all([
    getI18n(),
    listThreads(),
    listMentorTasks(),
    listMentorNotes(),
  ]);
  const M = m.mentor;
  const threadId = Number.isInteger(requested) && requested > 0 ? requested : (threads[0]?.id ?? null);
  const data = threadId ? await getThread(threadId) : null;
  const messages: ChatMessage[] = data
    ? displayMessages(data.messages).map((msg) => ({
        id: String(msg.id),
        role: msg.role,
        content: msg.content,
        tools: msg.tools.map((t) => ({
          name: t.name,
          ok: t.ok,
          summary: String(t.input[TOOL_SUMMARY_KEYS[t.name] ?? ""] ?? ""),
        })),
      }))
    : [];
  const fmt = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", {
    day: "numeric",
    month: "short",
  });
  const aiEnabled = isAiConfigured();

  return (
    <PageContainer className="max-w-[1500px]">
      <PageHeader
        title={M.title}
        description={M.description}
        actions={<NewThreadButton label={M.newThread} />}
      />
      {!aiEnabled ? <p className="text-warning mb-3 text-sm">{M.aiDisabled}</p> : null}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)_340px]">
        <Card className="h-fit p-3">
          <p className="mb-2 text-xs font-semibold">{M.threads}</p>
          {threads.length ? (
            <ul className="flex flex-col gap-1" data-testid="mentor-threads">
              {threads.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/mentor?thread=${t.id}`}
                    className={cn(
                      "hover:bg-surface-2 block rounded px-2 py-1 text-xs",
                      t.id === data?.thread.id && "bg-surface-2 font-medium",
                    )}
                  >
                    <span className="line-clamp-2">{t.title}</span>
                    <span className="text-subtle-foreground">{fmt.format(t.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-subtle-foreground mt-2 text-[11px]">{M.newThreadHelp}</p>
        </Card>

        <Card className="flex h-[calc(100dvh-13rem)] min-h-[480px] flex-col overflow-hidden p-0">
          <MentorChat
            key={`${data?.thread.id ?? "new"}:${messages.length}`}
            threadId={data?.thread.id ?? null}
            initialMessages={messages}
            enabled={aiEnabled}
            full={(data?.messages.length ?? 0) >= MENTOR_MAX_MESSAGES}
            lastError={data?.thread.lastError ?? null}
          />
          <p className="text-subtle-foreground border-border border-t px-4 py-1.5 text-[10px]">{M.privacy}</p>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{M.tasks.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <MentorTasks
                tasks={tasks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  details: t.details,
                  kind: t.kind,
                  href: taskHref(t.kind, t.ref),
                  dueOn: t.dueOn,
                  estimateMinutes: t.estimateMinutes,
                  status: t.status,
                  userNote: t.userNote,
                }))}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{M.notes.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-subtle-foreground text-[11px]">{M.notes.help}</p>
              <MentorNotes notes={notes.map((n) => ({ id: n.id, text: n.text }))} />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
