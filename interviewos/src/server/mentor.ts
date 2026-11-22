import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { and, asc, desc, eq, gte, max, sql } from "drizzle-orm";
import { SD_QUESTIONS } from "@content/system-design";
import { AiRefusalError, fallbackOptions, getAnthropic } from "@/lib/ai/client";
import {
  assignTaskInput,
  BANK_REF_PREFIX,
  buildMentorSystemPrompt,
  forgetInput,
  MENTOR_MAX_MESSAGES,
  MENTOR_MAX_NOTES,
  MENTOR_MAX_TOOL_ROUNDS,
  MENTOR_TOOLS,
  rememberInput,
  updateTaskInput,
} from "@/lib/ai/mentor";
import { db } from "@/lib/db";
import {
  applications,
  bankProblems,
  bankProgress,
  codingAttempts,
  codingProblems,
  companies,
  lessons,
  mentorMessages,
  mentorNotes,
  mentorTasks,
  mentorThreads,
} from "@/lib/db/schema";
import { env } from "@/lib/env";
import { getTopicStates } from "./insights";
import { listInterviews } from "./interviews";
import { getCareerProfile, listPostings, resumeFingerprint } from "./jobs";
import { log } from "./log";
import { listSdProgress } from "./system-design";
import { getCurrentUserId, getToday } from "./user";

type MessageParam = Anthropic.Beta.Messages.BetaMessageParam;
type ContentBlockParam = Anthropic.Beta.Messages.BetaContentBlockParam;

// ---------------------------------------------------------------------------------------------
// Threads, tasks, notes

export async function listThreads() {
  return db
    .select({ id: mentorThreads.id, title: mentorThreads.title, updatedAt: mentorThreads.updatedAt })
    .from(mentorThreads)
    .where(eq(mentorThreads.userId, getCurrentUserId()))
    .orderBy(desc(mentorThreads.updatedAt));
}

export async function getThread(id: number) {
  const [thread] = await db
    .select()
    .from(mentorThreads)
    .where(and(eq(mentorThreads.id, id), eq(mentorThreads.userId, getCurrentUserId())));
  if (!thread) return null;
  const messages = await db
    .select()
    .from(mentorMessages)
    .where(eq(mentorMessages.threadId, id))
    .orderBy(asc(mentorMessages.seq));
  return { thread, messages };
}

async function catalogue() {
  const [lessonRows, problemRows] = await Promise.all([
    db.select({ slug: lessons.slug, title: lessons.title }).from(lessons).orderBy(asc(lessons.slug)),
    db
      .select({ slug: codingProblems.slug, title: codingProblems.title })
      .from(codingProblems)
      .orderBy(asc(codingProblems.order)),
  ]);
  return {
    lessons: lessonRows,
    problems: problemRows,
    designQuestions: SD_QUESTIONS.map((q) => ({ slug: q.slug, title: q.title })),
  };
}

export async function createThread(title: string): Promise<number> {
  const [row] = await db
    .insert(mentorThreads)
    .values({
      userId: getCurrentUserId(),
      title: title.slice(0, 80),
      systemPrompt: buildMentorSystemPrompt(await catalogue()),
      model: env().ANTHROPIC_MODEL,
    })
    .returning({ id: mentorThreads.id });
  return row!.id;
}

export async function listMentorTasks() {
  return db
    .select()
    .from(mentorTasks)
    .where(eq(mentorTasks.userId, getCurrentUserId()))
    .orderBy(asc(mentorTasks.status), desc(mentorTasks.createdAt));
}

export async function setMentorTaskStatus(id: number, status: "open" | "done" | "skipped", note?: string) {
  const [row] = await db
    .update(mentorTasks)
    .set({
      status,
      completedAt: status === "open" ? null : new Date(),
      ...(note !== undefined ? { userNote: note } : {}),
    })
    .where(and(eq(mentorTasks.id, id), eq(mentorTasks.userId, getCurrentUserId())))
    .returning({ id: mentorTasks.id, title: mentorTasks.title });
  return row ?? null;
}

export async function listMentorNotes() {
  return db
    .select()
    .from(mentorNotes)
    .where(eq(mentorNotes.userId, getCurrentUserId()))
    .orderBy(asc(mentorNotes.createdAt));
}

export async function deleteMentorNote(id: number) {
  const rows = await db
    .delete(mentorNotes)
    .where(and(eq(mentorNotes.id, id), eq(mentorNotes.userId, getCurrentUserId())))
    .returning({ id: mentorNotes.id });
  return rows.length > 0;
}

export async function openMentorTaskCount(): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(mentorTasks)
    .where(and(eq(mentorTasks.userId, getCurrentUserId()), eq(mentorTasks.status, "open")));
  return r?.n ?? 0;
}

// ---------------------------------------------------------------------------------------------
// Progress snapshot: the facts the mentor reasons from

const line = (label: string, value: string | null | undefined) =>
  value?.trim() ? `${label}: ${value.trim()}\n` : "";

export async function buildProgressSnapshot(): Promise<string> {
  const userId = getCurrentUserId();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [today, profile, topics, attempts, bank, sd, interviews, postings, apps, tasks, notes] =
    await Promise.all([
      getToday(),
      getCareerProfile(),
      getTopicStates(),
      db
        .select({ outcome: codingAttempts.outcome, n: sql<number>`count(*)::int` })
        .from(codingAttempts)
        .where(and(eq(codingAttempts.userId, userId), gte(codingAttempts.createdAt, since)))
        .groupBy(codingAttempts.outcome),
      db
        .select({ status: bankProgress.status, n: sql<number>`count(*)::int` })
        .from(bankProgress)
        .where(eq(bankProgress.userId, userId))
        .groupBy(bankProgress.status),
      listSdProgress(),
      listInterviews(),
      listPostings(),
      db
        .select({ company: companies.name, role: applications.role, stage: applications.stage })
        .from(applications)
        .innerJoin(companies, eq(companies.id, applications.companyId))
        .where(eq(applications.userId, userId)),
      listMentorTasks(),
      listMentorNotes(),
    ]);

  const byStatus = (s: string) => topics.filter((t) => t.status === s);
  const titles = (xs: { title: string }[], n = 30) =>
    xs
      .slice(0, n)
      .map((x) => x.title)
      .join(", ") || "none";
  const sdCounts = new Map<string, string[]>();
  for (const [slug, p] of sd)
    if (p.status !== "not_started") sdCounts.set(p.status, [...(sdCounts.get(p.status) ?? []), slug]);
  const attemptsText = attempts.map((a) => `${a.outcome} ${a.n}`).join(", ") || "none";
  const bankText = bank.map((b) => `${b.status} ${b.n}`).join(", ") || "none";
  const ivText =
    interviews
      .slice(0, 6)
      .map(
        (i) =>
          `- ${i.startedAt.toISOString().slice(0, 10)} ${i.type}${i.companyName ? ` (${i.companyName})` : ""}: ${i.status}${i.score != null ? `, score ${i.score}/100` : ""}`,
      )
      .join("\n") || "none";
  const postingText =
    postings
      .slice(0, 20)
      .map(
        (p) =>
          `- [${p.status}] ${p.title} at ${p.company}${p.fit ? ` (fit ${p.fit.score})` : ""}${p.url ? ` ${p.url}` : ""}`,
      )
      .join("\n") || "none";
  const taskText = (status: "open" | "done" | "skipped", n: number) =>
    tasks
      .filter((t) => t.status === status)
      .slice(0, n)
      .map(
        (t) =>
          `- #${t.id} ${t.title} (${t.kind}${t.ref ? `, ${t.ref}` : ""}${t.dueOn ? `, due ${t.dueOn}` : ""})${t.userNote ? ` — candidate: ${t.userNote}` : ""}`,
      )
      .join("\n") || "none";

  return `<current_progress as_of="${today}">
## Profile
${line("Target roles", profile.targetRoles)}${line("Locations", profile.locations)}${line("Work modes", profile.workModes.join(", "))}${line("Levels", profile.levels.join(", "))}${line("Availability", profile.availability)}${line("Work authorization", profile.workAuthorization)}${line("Languages", profile.languages)}${line("Preferences", profile.preferences)}CV:
${profile.resume.trim().slice(0, 10_000) || "(not provided)"}

## Learning (InterviewOS topics; status comes from graded practice, not from reading)
interview_ready ${byStatus("interview_ready").length}, practicing ${byStatus("practicing").length}, needs_review ${byStatus("needs_review").length}, learning ${byStatus("learning").length}, not_started ${byStatus("not_started").length}
Needs review: ${titles(byStatus("needs_review"))}
Practicing: ${titles(byStatus("practicing"))}
Interview-ready: ${titles(byStatus("interview_ready"))}

## Practice
Coding attempts, last 30 days: ${attemptsText}
Problem bank (self-reported): ${bankText}
System design: ${[...sdCounts].map(([s, slugs]) => `${s}: ${slugs.join(", ")}`).join("; ") || "none practised"}
Mock interviews (latest first):
${ivText}

## Job search
Postings:
${postingText}
Applications (company tracks): ${apps.map((a) => `${a.company} — ${a.role}: ${a.stage}`).join("; ") || "none"}

## Your tasks for the candidate
Open:
${taskText("open", 20)}
Recently done:
${taskText("done", 10)}
Skipped:
${taskText("skipped", 5)}

## Your notes
${notes.map((n) => `- #${n.id} ${n.text}`).join("\n") || "none"}
</current_progress>`;
}

// ---------------------------------------------------------------------------------------------
// Tools

export type MentorEvent =
  { type: "delta"; text: string } | { type: "tool"; name: string; ok: boolean; summary: string };

async function refExists(kind: string, ref: string): Promise<string | null> {
  if (kind === "lesson") {
    const [r] = await db.select({ slug: lessons.slug }).from(lessons).where(eq(lessons.slug, ref));
    return r ? ref : null;
  }
  if (kind === "system_design") return SD_QUESTIONS.some((q) => q.slug === ref) ? ref : null;
  if (kind === "problem") {
    const slug = ref.startsWith(BANK_REF_PREFIX) ? ref.slice(BANK_REF_PREFIX.length) : ref;
    const [own] = await db
      .select({ slug: codingProblems.slug })
      .from(codingProblems)
      .where(eq(codingProblems.slug, slug));
    if (own) return slug;
    const [bank] = await db
      .select({ slug: bankProblems.slug })
      .from(bankProblems)
      .where(eq(bankProblems.slug, slug));
    return bank ? `${BANK_REF_PREFIX}${slug}` : null;
  }
  if (kind === "mock_interview")
    return ["algorithms", "backend", "fullstack", "system_design", "behavioral"].includes(ref) ? ref : null;
  return ref;
}

async function runTool(
  threadId: number,
  name: string,
  rawInput: unknown,
): Promise<{ content: string; isError: boolean; summary: string }> {
  const userId = getCurrentUserId();
  const fail = (content: string) => ({ content, isError: true, summary: content });
  try {
    if (name === "assign_task") {
      const parsed = assignTaskInput.safeParse(rawInput);
      if (!parsed.success)
        return fail(`Invalid input: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
      const t = parsed.data;
      let ref: string | null = null;
      if (t.ref) {
        ref = await refExists(t.kind, t.ref);
        if (!ref)
          return fail(`Unknown ${t.kind} reference "${t.ref}". Use a slug from the catalogue, or omit ref.`);
      }
      if (t.due_on && t.due_on < (await getToday())) return fail("due_on is in the past.");
      const [row] = await db
        .insert(mentorTasks)
        .values({
          userId,
          threadId,
          title: t.title,
          details: t.details,
          kind: t.kind,
          ref,
          dueOn: t.due_on ?? null,
          estimateMinutes: t.estimate_minutes ?? null,
        })
        .returning({ id: mentorTasks.id });
      return { content: `Task #${row!.id} added to the candidate's list.`, isError: false, summary: t.title };
    }
    if (name === "update_task") {
      const parsed = updateTaskInput.safeParse(rawInput);
      if (!parsed.success) return fail("Invalid input.");
      const row = await setMentorTaskStatus(parsed.data.task_id, parsed.data.status, parsed.data.note);
      if (!row) return fail(`Task #${parsed.data.task_id} does not exist.`);
      return {
        content: `Task #${row.id} is now ${parsed.data.status}.`,
        isError: false,
        summary: `${row.title}: ${parsed.data.status}`,
      };
    }
    if (name === "remember") {
      const parsed = rememberInput.safeParse(rawInput);
      if (!parsed.success) return fail("Invalid input.");
      const [{ n }] = (await db
        .select({ n: sql<number>`count(*)::int` })
        .from(mentorNotes)
        .where(eq(mentorNotes.userId, userId))) as [{ n: number }];
      if (n >= MENTOR_MAX_NOTES)
        return fail(`You already keep ${MENTOR_MAX_NOTES} notes; forget an outdated one first.`);
      const [row] = await db
        .insert(mentorNotes)
        .values({ userId, text: parsed.data.note })
        .returning({ id: mentorNotes.id });
      return { content: `Saved as note #${row!.id}.`, isError: false, summary: parsed.data.note };
    }
    if (name === "forget") {
      const parsed = forgetInput.safeParse(rawInput);
      if (!parsed.success) return fail("Invalid input.");
      return (await deleteMentorNote(parsed.data.note_id))
        ? {
            content: `Note #${parsed.data.note_id} deleted.`,
            isError: false,
            summary: `#${parsed.data.note_id}`,
          }
        : fail(`Note #${parsed.data.note_id} does not exist.`);
    }
    return fail(`Unknown tool ${name}.`);
  } catch (err) {
    log.warn("mentor", "tool failed", { name, error: err instanceof Error ? err.message : String(err) });
    return fail("The tool failed on the server; continue without it.");
  }
}

// ---------------------------------------------------------------------------------------------
// Conversation

async function nextSeq(threadId: number) {
  const [r] = await db
    .select({ m: max(mentorMessages.seq) })
    .from(mentorMessages)
    .where(eq(mentorMessages.threadId, threadId));
  return (r?.m ?? -1) + 1;
}

async function append(
  threadId: number,
  values: Omit<typeof mentorMessages.$inferInsert, "threadId" | "seq">,
) {
  await db.insert(mentorMessages).values({ threadId, seq: await nextSeq(threadId), ...values });
}

/**
 * Adds the candidate's message and streams the mentor's reply, running its tools in between.
 * History is append-only and replayed unchanged (including thinking blocks); the progress
 * snapshot is attached to the user turn only when it changed since the last one sent.
 */
export async function sendMentorMessage(
  threadId: number,
  text: string,
  onEvent: (e: MentorEvent) => void,
): Promise<void> {
  const data = await getThread(threadId);
  if (!data) throw new Error("Conversation not found");
  const { thread } = data;
  if (data.messages.length >= MENTOR_MAX_MESSAGES)
    throw new Error("This conversation is full. Start a new one — tasks and notes carry over.");

  const snapshot = await buildProgressSnapshot();
  const hash = await resumeFingerprint(snapshot.replace(/as_of="[^"]*"/, ""));
  const userContent: ContentBlockParam[] = [];
  if (hash !== thread.contextHash) userContent.push({ type: "text", text: snapshot });
  userContent.push({ type: "text", text });
  await append(threadId, { role: "user", content: text, apiContent: userContent });
  if (!data.messages.length)
    await db
      .update(mentorThreads)
      .set({ title: text.slice(0, 80) })
      .where(eq(mentorThreads.id, threadId));
  await db
    .update(mentorThreads)
    .set({ contextHash: hash, updatedAt: new Date(), lastError: null })
    .where(eq(mentorThreads.id, threadId));
  await continueConversation(threadId, onEvent);
}

/** Runs the model until it answers without tool calls. Also used to retry after a failure. */
export async function continueConversation(threadId: number, onEvent: (e: MentorEvent) => void) {
  for (let round = 0; round < MENTOR_MAX_TOOL_ROUNDS; round++) {
    const data = await getThread(threadId);
    if (!data) throw new Error("Conversation not found");
    const messages: MessageParam[] = data.messages.map((m) => ({
      role: m.role,
      content: m.apiContent as MessageParam["content"],
    })) as MessageParam[];
    if (!messages.length || messages[messages.length - 1]!.role !== "user") return;

    const stream = getAnthropic().beta.messages.stream({
      model: data.thread.model,
      max_tokens: env().ANTHROPIC_MAX_TOKENS_CHAT,
      ...fallbackOptions(),
      thinking: { type: "adaptive" },
      output_config: { effort: env().ANTHROPIC_EFFORT_CHAT },
      cache_control: { type: "ephemeral" },
      system: data.thread.systemPrompt,
      tools: MENTOR_TOOLS,
      messages,
    });
    stream.on("text", (delta) => onEvent({ type: "delta", text: delta }));
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") throw new AiRefusalError(final.stop_details?.explanation);

    const replyText = final.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    await append(threadId, {
      role: "assistant",
      content: replyText,
      apiContent: final.content,
      inputTokens: final.usage.input_tokens,
      outputTokens: final.usage.output_tokens,
    });
    log.info("mentor", "reply", {
      thread: threadId,
      input: final.usage.input_tokens,
      cached: final.usage.cache_read_input_tokens ?? 0,
      output: final.usage.output_tokens,
    });

    const toolUses = final.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (final.stop_reason !== "tool_use" || !toolUses.length) {
      if (final.stop_reason === "max_tokens") onEvent({ type: "delta", text: "\n\n…" });
      return;
    }
    const results: ContentBlockParam[] = [];
    for (const use of toolUses) {
      const r = await runTool(threadId, use.name, use.input);
      onEvent({ type: "tool", name: use.name, ok: !r.isError, summary: r.summary });
      results.push({
        type: "tool_result",
        tool_use_id: use.id,
        content: r.content,
        is_error: r.isError || undefined,
      });
    }
    await append(threadId, { role: "user", content: "", apiContent: results, hidden: true });
    onEvent({ type: "delta", text: "\n\n" });
  }
}

/** Display rows: user messages and assistant text, plus the tools each assistant turn used. */
export function displayMessages(rows: (typeof mentorMessages.$inferSelect)[]) {
  return rows
    .filter((m) => !m.hidden)
    .map((m) => {
      const blocks = Array.isArray(m.apiContent)
        ? (m.apiContent as { type: string; name?: string; input?: unknown }[])
        : [];
      const tools = blocks
        .filter((b) => b.type === "tool_use")
        .map((b) => ({ name: b.name ?? "", input: (b.input ?? {}) as Record<string, unknown> }));
      return { id: m.id, role: m.role, content: m.content, tools, createdAt: m.createdAt };
    })
    .filter((m) => m.content || m.tools.length);
}
