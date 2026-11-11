import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { describeAiError } from "@/lib/ai/client";
import { isAiConfigured } from "@/lib/ai/config";
import { evaluateInterview, getInterview } from "@/server/interviews";
import { log } from "@/server/log";

// Evaluations can take a while with high effort.
export const maxDuration = 300;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAiConfigured())
    return NextResponse.json({ error: "AI is not configured on the server." }, { status: 503 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const data = await getInterview(id);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    await evaluateInterview(id);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = describeAiError(err);
    log.warn("interview", "evaluation failed", { id, error: message });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
