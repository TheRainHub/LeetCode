import "server-only";
import { SD_QUESTIONS } from "@content/system-design";
import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { and, asc, desc, eq, gt, max } from "drizzle-orm";
import { AiRefusalError, fallbackOptions, getAnthropic } from "@/lib/ai/client";
import {
  buildEvaluatorSystemPrompt,
  buildTranscript,
  EvaluationSchema,
  sanitizeEvaluation,
} from "@/lib/ai/evaluation";
import { buildInterviewerSystemPrompt, OPENING_MESSAGE, type InterviewType } from "@/lib/ai/interviewer";
import { db } from "@/lib/db";
import {
  codingAttempts,
  codingProblems,
  companies,
  companyFocusTopics,
  interviewEvaluations,
  interviewMessages,
  interviewTopics,
  mockInterviews,
  topics,
} from "@/lib/db/schema";
import { env } from "@/lib/env";
import { log } from "./log";
import { recomputeTopicProgress } from "./mastery";
import { completeMatchingTasks } from "./scheduler";
import { createCard } from "./srs";
import { logTime } from "./time";
import { getCurrentUserId, getSettings } from "./user";

export const MAX_MESSAGES = 160;

export async function createInterview(input: {
  companySlug: string | null;
  type: InterviewType;
  difficulty: "easy" | "medium" | "hard";
  durationMinutes: number;
  language: "java" | "typescript" | "python";
  /** System design question slug (content/system-design.ts) to run, if any. */
  sdQuestionSlug?: string | null;
}) {
  const userId = getCurrentUserId();
  const designQuestion = input.sdQuestionSlug
    ? (SD_QUESTIONS.find((q) => q.slug === input.sdQuestionSlug) ?? null)
    : null;
  const settings = await getSettings();
  let company: { id: number; name: string; role: string; focusTopics: string[] } | null = null;
  if (input.companySlug) {
    const [c] = await db.select().from(companies).where(eq(companies.slug, input.companySlug));
    if (c) {
      const focus = await db
        .select({ title: topics.title, weight: companyFocusTopics.weight })
        .from(companyFocusTopics)
        .innerJoin(topics, eq(topics.id, companyFocusTopics.topicId))
        .where(and(eq(companyFocusTopics.companyId, c.id), gt(companyFocusTopics.weight, 0)))
        .orderBy(desc(companyFocusTopics.weight));
      company = { id: c.id, name: c.name, role: c.role, focusTopics: focus.slice(0, 16).map((f) => f.title) };
    }
  }
  const practised = await db
    .selectDistinct({ title: codingProblems.title })
    .from(codingAttempts)
    .innerJoin(codingProblems, eq(codingProblems.id, codingAttempts.problemId))
    .where(eq(codingAttempts.userId, userId));

  const systemPrompt = buildInterviewerSystemPrompt({
    type: input.type,
    difficulty: input.difficulty,
    durationMinutes: input.durationMinutes,
    language: input.language,
    company,
    candidateProfile: settings.interviewerProfile,
    practisedProblems: practised.map((p) => p.title),
    designQuestion: designQuestion ? { title: designQuestion.title, prompt: designQuestion.prompt } : null,
  });

  const [row] = await db
    .insert(mockInterviews)
    .values({
      userId,
      companyId: company?.id ?? null,
      type: input.type,
      difficulty: input.difficulty,
      durationMinutes: input.durationMinutes,
      language: input.language,
      model: env().ANTHROPIC_MODEL,
      systemPrompt,
      sdQuestionSlug: designQuestion?.slug ?? null,
    })
    .returning({ id: mockInterviews.id });
  log.info("interview", "created", { id: row!.id, type: input.type, company: company?.name ?? null });
  return row!.id;
}

export async function getInterview(id: number) {
  const [row] = await db
    .select({
      interview: mockInterviews,
      companyName: companies.name,
      companySlug: companies.slug,
      companyRole: companies.role,
    })
    .from(mockInterviews)
    .leftJoin(companies, eq(companies.id, mockInterviews.companyId))
    .where(and(eq(mockInterviews.id, id), eq(mockInterviews.userId, getCurrentUserId())));
  if (!row) return null;
  const [messages, evaluation] = await Promise.all([
    db
      .select()
      .from(interviewMessages)
      .where(eq(interviewMessages.interviewId, id))
      .orderBy(asc(interviewMessages.seq)),
    db.select().from(interviewEvaluations).where(eq(interviewEvaluations.interviewId, id)),
  ]);
  return { ...row, messages, evaluation: evaluation[0] ?? null };
}

export async function listInterviews() {
  return db
    .select({
      id: mockInterviews.id,
      type: mockInterviews.type,
      difficulty: mockInterviews.difficulty,
      status: mockInterviews.status,
      startedAt: mockInterviews.startedAt,
      endedAt: mockInterviews.endedAt,
      durationMinutes: mockInterviews.durationMinutes,
      companyName: companies.name,
      score: interviewEvaluations.overallScore,
    })
    .from(mockInterviews)
    .leftJoin(companies, eq(companies.id, mockInterviews.companyId))
    .leftJoin(interviewEvaluations, eq(interviewEvaluations.interviewId, mockInterviews.id))
    .where(eq(mockInterviews.userId, getCurrentUserId()))
    .orderBy(desc(mockInterviews.startedAt));
}

async function nextSeq(interviewId: number) {
  const [r] = await db
    .select({ m: max(interviewMessages.seq) })
    .from(interviewMessages)
    .where(eq(interviewMessages.interviewId, interviewId));
  return (r?.m ?? -1) + 1;
}

export async function appendUserMessage(
  interviewId: number,
  content: string,
  kind: "normal" | "hint_request" | "opening",
) {
  const seq = await nextSeq(interviewId);
  await db
    .insert(interviewMessages)
    .values({ interviewId, seq, role: "user", kind, content, apiContent: content });
  if (kind === "hint_request") {
    const [iv] = await db
      .select({ h: mockInterviews.hintsRequested })
      .from(mockInterviews)
      .where(eq(mockInterviews.id, interviewId));
    await db
      .update(mockInterviews)
      .set({ hintsRequested: (iv?.h ?? 0) + 1 })
      .where(eq(mockInterviews.id, interviewId));
  }
}

/**
 * Streams the interviewer's next reply. History is replayed append-only:
 * user messages exactly as sent, assistant messages with their original
 * content blocks (including thinking), and the frozen system prompt.
 */
export async function streamInterviewerReply(
  interviewId: number,
  onText: (text: string) => void,
): Promise<{ text: string }> {
  const data = await getInterview(interviewId);
  if (!data) throw new Error("Interview not found");
  const { interview, messages } = data;
  if (interview.status !== "in_progress") throw new Error("This interview has ended.");
  if (messages.length >= MAX_MESSAGES)
    throw new Error("This interview has reached its message limit. End it to get your evaluation.");

  type AssistantContent = Extract<Anthropic.Beta.BetaMessageParam, { role: "assistant" }>["content"];
  type UserContent = Extract<Anthropic.Beta.BetaMessageParam, { role: "user" }>["content"];
  const apiMessages: Anthropic.Beta.BetaMessageParam[] = messages.map((m) =>
    m.role === "assistant"
      ? { role: "assistant", content: m.apiContent as AssistantContent }
      : { role: "user", content: m.apiContent as UserContent },
  );
  if (apiMessages.length === 0 || apiMessages[apiMessages.length - 1]!.role !== "user") {
    throw new Error("Nothing to reply to.");
  }

  const stream = getAnthropic().beta.messages.stream({
    model: interview.model,
    max_tokens: env().ANTHROPIC_MAX_TOKENS_CHAT,
    ...fallbackOptions(),
    thinking: { type: "adaptive" },
    output_config: { effort: env().ANTHROPIC_EFFORT_CHAT },
    cache_control: { type: "ephemeral" },
    system: interview.systemPrompt,
    messages: apiMessages,
  });
  stream.on("text", (delta) => onText(delta));
  const final = await stream.finalMessage();

  if (final.stop_reason === "refusal") throw new AiRefusalError(final.stop_details?.explanation);
  const text = final.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!text) throw new Error("The interviewer returned an empty reply. Try again.");

  await db.insert(interviewMessages).values({
    interviewId,
    seq: await nextSeq(interviewId),
    role: "assistant",
    kind: "normal",
    content: text,
    apiContent: final.content,
    inputTokens: final.usage.input_tokens,
    outputTokens: final.usage.output_tokens,
  });
  if (interview.lastError)
    await db.update(mockInterviews).set({ lastError: null }).where(eq(mockInterviews.id, interviewId));
  log.info("interview", "reply", {
    id: interviewId,
    input: final.usage.input_tokens,
    cached: final.usage.cache_read_input_tokens ?? 0,
    output: final.usage.output_tokens,
  });
  return { text };
}

export async function startInterviewIfNeeded(interviewId: number) {
  const data = await getInterview(interviewId);
  if (!data) throw new Error("Interview not found");
  if (data.messages.length === 0) await appendUserMessage(interviewId, OPENING_MESSAGE, "opening");
}

export async function abandonInterview(interviewId: number) {
  await db
    .update(mockInterviews)
    .set({ status: "abandoned", endedAt: new Date() })
    .where(and(eq(mockInterviews.id, interviewId), eq(mockInterviews.userId, getCurrentUserId())));
}

/** Ends the interview and produces a structured, evidence-based evaluation. */
export async function evaluateInterview(interviewId: number) {
  const data = await getInterview(interviewId);
  if (!data) throw new Error("Interview not found");
  const { interview, messages } = data;
  if (data.evaluation) return data.evaluation;

  const candidateTurns = messages.filter((m) => m.role === "user" && m.kind !== "opening").length;
  if (candidateTurns < 2)
    throw new Error("Not enough conversation to evaluate yet — answer at least two questions first.");

  const endedAt = interview.endedAt ?? new Date();
  await db
    .update(mockInterviews)
    .set({ status: "evaluating", endedAt })
    .where(eq(mockInterviews.id, interviewId));

  const [topicRows, problemRows] = await Promise.all([
    db.select({ slug: topics.slug, title: topics.title }).from(topics).orderBy(asc(topics.slug)),
    db.select({ slug: codingProblems.slug, title: codingProblems.title }).from(codingProblems),
  ]);
  const actualMinutes = Math.max(1, Math.round((endedAt.getTime() - interview.startedAt.getTime()) / 60000));
  const transcript = buildTranscript(
    messages.map((m) => ({ role: m.role, content: m.content, kind: m.kind })),
  );
  const metadata = [
    `Interview type: ${interview.type}; difficulty: ${interview.difficulty}; language: ${interview.language}`,
    data.companyName ? `Target: ${data.companyRole} at ${data.companyName}` : "Target: general practice",
    `Planned duration: ${interview.durationMinutes} min; actual: ${actualMinutes} min`,
    `Hints requested by the candidate: ${interview.hintsRequested}`,
  ].join("\n");

  try {
    const response = await getAnthropic().beta.messages.parse({
      model: interview.model,
      max_tokens: env().ANTHROPIC_MAX_TOKENS_EVALUATION,
      ...fallbackOptions(),
      thinking: { type: "adaptive" },
      output_config: {
        effort: env().ANTHROPIC_EFFORT_EVALUATION,
        format: betaZodOutputFormat(EvaluationSchema),
      },
      system: buildEvaluatorSystemPrompt(),
      messages: [
        {
          role: "user",
          content: `<metadata>\n${metadata}\n</metadata>\n\n<topic_catalog>\n${topicRows.map((t) => `${t.slug} — ${t.title}`).join("\n")}\n</topic_catalog>\n\n<problem_catalog>\n${problemRows.map((p) => `${p.slug} — ${p.title}`).join("\n")}\n</problem_catalog>\n\n<transcript>\n${transcript}\n</transcript>`,
        },
      ],
    });
    if (response.stop_reason === "refusal") throw new AiRefusalError(response.stop_details?.explanation);
    if (response.stop_reason === "max_tokens")
      throw new Error(
        "The evaluation was cut off (token limit). Raise ANTHROPIC_MAX_TOKENS_EVALUATION and retry.",
      );
    if (!response.parsed_output) throw new Error("The evaluation could not be parsed. Retry.");

    const ev = sanitizeEvaluation(response.parsed_output, {
      topicSlugs: new Set(topicRows.map((t) => t.slug)),
      problemSlugs: new Set(problemRows.map((p) => p.slug)),
    });
    const topicId = new Map(
      (await db.select({ id: topics.id, slug: topics.slug }).from(topics)).map((t) => [t.slug, t.id]),
    );

    const [saved] = await db.transaction(async (tx) => {
      const rows = await tx
        .insert(interviewEvaluations)
        .values({
          interviewId,
          overallScore: ev.overallScore,
          summary: ev.summary,
          dimensions: ev.dimensions,
          strengths: ev.strengths,
          weaknesses: ev.weaknesses,
          mistakes: ev.mistakes,
          modelAnswer: ev.modelAnswer,
          recommendedTopics: ev.recommendedTopics,
          followUpExercises: ev.followUpExercises,
          srsSuggestions: ev.spacedRepetition,
          model: response.model,
        })
        .returning();
      for (const t of ev.coveredTopics) {
        await tx
          .insert(interviewTopics)
          .values({ interviewId, topicId: topicId.get(t.topicSlug)!, score: t.score })
          .onConflictDoNothing();
      }
      await tx
        .update(mockInterviews)
        .set({ status: "completed", lastError: null })
        .where(eq(mockInterviews.id, interviewId));
      return rows;
    });

    for (const [i, card] of ev.spacedRepetition.entries()) {
      await createCard({
        topicId: card.topicSlug ? (topicId.get(card.topicSlug) ?? null) : null,
        prompt: card.prompt,
        answer: card.answer,
        source: "interview",
        sourceRef: `interview:${interviewId}:${i}`,
      });
    }
    const affected = [
      ...ev.coveredTopics,
      ...ev.spacedRepetition.filter((c) => c.topicSlug).map((c) => ({ topicSlug: c.topicSlug! })),
    ]
      .map((t) => topicId.get(t.topicSlug))
      .filter((x): x is number => x !== undefined);
    await recomputeTopicProgress([...new Set(affected)]);
    await logTime("interview", actualMinutes * 60, `interview:${interviewId}`);
    await completeMatchingTasks("mock", null);
    log.info("interview", "evaluated", {
      id: interviewId,
      score: ev.overallScore,
      output: response.usage.output_tokens,
    });
    return saved!;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(mockInterviews)
      .set({ status: "evaluating", lastError: message.slice(0, 500) })
      .where(eq(mockInterviews.id, interviewId));
    throw err;
  }
}
