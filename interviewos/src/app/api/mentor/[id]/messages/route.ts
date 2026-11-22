import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { describeAiError } from "@/lib/ai/client";
import { isAiConfigured } from "@/lib/ai/config";
import { db } from "@/lib/db";
import { mentorThreads } from "@/lib/db/schema";
import { log } from "@/server/log";
import { continueConversation, getThread, type MentorEvent, sendMentorMessage } from "@/server/mentor";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send"), text: z.string().trim().min(1).max(8000) }),
  z.object({ action: z.literal("retry") }),
]);

export const maxDuration = 300;

/**
 * Streams the mentor's reply as NDJSON lines:
 *   {"type":"delta","text":"…"} {"type":"tool","name":"assign_task","ok":true,"summary":"…"} … {"type":"done"}
 *   | {"type":"error","message":"…"}
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAiConfigured())
    return NextResponse.json({ error: "AI is not configured on the server." }, { status: 503 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (!(await getThread(id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = parsed.data;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: MentorEvent | { type: "done" } | { type: "error"; message: string }) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
      try {
        if (body.action === "send") await sendMentorMessage(id, body.text, send);
        else await continueConversation(id, send);
        send({ type: "done" });
      } catch (err) {
        const message = describeAiError(err);
        log.warn("mentor", "reply failed", { id, error: message });
        await db
          .update(mentorThreads)
          .set({ lastError: message.slice(0, 500) })
          .where(eq(mentorThreads.id, id));
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
