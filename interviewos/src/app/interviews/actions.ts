"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isAiConfigured } from "@/lib/ai/config";
import { INTERVIEW_TYPES } from "@/lib/ai/interviewer";
import { abandonInterview, createInterview } from "@/server/interviews";

const schema = z.object({
  companySlug: z.string().max(80).nullable(),
  type: z.enum(INTERVIEW_TYPES),
  difficulty: z.enum(["easy", "medium", "hard"]),
  durationMinutes: z.number().int().min(10).max(120),
  language: z.enum(["java", "typescript", "python"]),
});

export async function createInterviewAction(
  input: z.input<typeof schema>,
): Promise<{ ok: false; error: string } | never> {
  if (!isAiConfigured())
    return { ok: false, error: "AI is not configured. Set ANTHROPIC_API_KEY on the server." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  const id = await createInterview(parsed.data);
  revalidatePath("/interviews");
  redirect(`/interviews/${id}`);
}

export async function abandonInterviewAction(input: { id: number }): Promise<{ ok: boolean }> {
  const { id } = z.object({ id: z.number().int().positive() }).parse(input);
  await abandonInterview(id);
  revalidatePath("/", "layout");
  return { ok: true };
}
