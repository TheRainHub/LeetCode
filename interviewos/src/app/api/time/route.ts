import { NextResponse } from "next/server";
import { z } from "zod";
import { logTime } from "@/server/time";

const bodySchema = z.object({
  kind: z.enum(["lesson", "problem", "review", "lab", "interview", "experience", "exercise"]),
  ref: z.string().max(200).optional(),
  seconds: z
    .number()
    .min(0)
    .max(4 * 3600),
});

/** Receives active-time beacons from the client (visible tab time only). */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  await logTime(parsed.data.kind, parsed.data.seconds, parsed.data.ref);
  return NextResponse.json({ ok: true });
}
