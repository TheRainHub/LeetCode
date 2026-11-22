import { runDueAutoSearch } from "@/server/job-auto";

export const maxDuration = 300;

/**
 * Runs one due automatic search when the user opens the job pages (catch-up for times the
 * scheduler did not run, e.g. locally). Streams progress as NDJSON, ending with
 * {"type":"result", ...AutoRunResult}.
 */
export async function POST() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
      try {
        const result = await runDueAutoSearch(send);
        send({ type: "result", ...result });
      } catch (err) {
        send({
          type: "result",
          status: "idle",
          reason: "error",
          message: err instanceof Error ? err.message : "Error",
        });
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
