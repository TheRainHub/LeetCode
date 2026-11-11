import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { describeAiError } from "@/lib/ai/client";
import { isAiConfigured } from "@/lib/ai/config";
import { formatCandidateMessage } from "@/lib/ai/interviewer";
import { db } from "@/lib/db";
import { mockInterviews } from "@/lib/db/schema";
import {
  appendUserMessage,
  getInterview,
  startInterviewIfNeeded,
  streamInterviewerReply,
} from "@/server/interviews";
import { log } from "@/server/log";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("retry") }),
  z.object({
    action: z.literal("send"),
    kind: z.enum(["normal", "hint_request"]),
    text: z.string().max(8000),
    code: z.object({ language: z.string().max(20), code: z.string().max(20000) }).nullable(),
  }),
]);

/**
 * Streams the interviewer's reply as NDJSON lines:
 *   {"type":"delta","text":"…"} … {"type":"done"} | {"type":"error","message":"…"}
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAiConfigured())
    return NextResponse.json({ error: "AI is not configured on the server." }, { status: 503 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const data = await getInterview(id);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (data.interview.status !== "in_progress")
    return NextResponse.json({ error: "This interview has ended." }, { status: 409 });

  const body = parsed.data;
  if (body.action === "start") {
    if (data.messages.some((m) => m.role === "assistant"))
      return NextResponse.json({ error: "Already started" }, { status: 409 });
    await startInterviewIfNeeded(id);
  } else if (body.action === "send") {
    if (!body.text.trim() && !body.code?.code.trim() && body.kind !== "hint_request") {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }
    const elapsed = (Date.now() - data.interview.startedAt.getTime()) / 60000;
    const content = formatCandidateMessage({
      text: body.text,
      kind: body.kind,
      code: body.code,
      elapsedMinutes: elapsed,
      durationMinutes: data.interview.durationMinutes,
    });
    await appendUserMessage(id, content, body.kind);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
      try {
        await streamInterviewerReply(id, (text) => send({ type: "delta", text }));
        send({ type: "done" });
      } catch (err) {
        const message = describeAiError(err);
        log.warn("interview", "reply failed", { id, error: message });
        await db
          .update(mockInterviews)
          .set({ lastError: message.slice(0, 500) })
          .where(eq(mockInterviews.id, id));
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
