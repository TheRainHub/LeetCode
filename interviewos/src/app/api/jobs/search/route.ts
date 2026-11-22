import { NextResponse } from "next/server";
import { describeAiError } from "@/lib/ai/client";
import { isAiConfigured } from "@/lib/ai/config";
import { findJobs } from "@/lib/ai/jobs";
import { MIN_RESUME_CHARS, searchCriteriaSchema } from "@/lib/jobs/model";
import { getCareerProfile, listPostings, saveSearch } from "@/server/jobs";
import { log } from "@/server/log";

// Web research takes a few minutes (Vercel function limit; Workers have no wall-clock limit).
export const maxDuration = 300;

/**
 * Runs the AI job finder and streams progress as NDJSON lines:
 *   {"type":"search","query":"…"} {"type":"fetch","url":"…"} {"type":"results","count":n} {"type":"writing"}
 *   … then {"type":"done","searchId":n} | {"type":"error","message":"…"}
 */
export async function POST(request: Request) {
  if (!isAiConfigured())
    return NextResponse.json({ error: "AI is not configured on the server." }, { status: 503 });
  const parsed = searchCriteriaSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const criteria = parsed.data;
  const [profile, postings] = await Promise.all([getCareerProfile(), listPostings()]);
  if (profile.resume.trim().length < MIN_RESUME_CHARS && !criteria.roles && !profile.targetRoles)
    return NextResponse.json(
      { error: "Add your résumé or target roles in the profile first." },
      { status: 400 },
    );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
      try {
        const found = await findJobs({
          profile,
          criteria,
          alreadySaved: postings.map((p) => `${p.company} — ${p.title}`),
          onEvent: send,
        });
        const row = await saveSearch({
          criteria,
          results: found.jobs,
          sources: found.sources,
          notes: found.notes,
          searches: found.searches,
          dropped: found.dropped,
          error: null,
        });
        log.info("jobs", "search finished", { id: row.id, jobs: found.jobs.length, dropped: found.dropped });
        send({ type: "done", searchId: row.id });
      } catch (err) {
        const message = describeAiError(err);
        log.warn("jobs", "search failed", { error: message });
        await saveSearch({
          criteria,
          results: [],
          sources: [],
          notes: "",
          searches: 0,
          dropped: 0,
          error: message.slice(0, 500),
        }).catch(() => {});
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
