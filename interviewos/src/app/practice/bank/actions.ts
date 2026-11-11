"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BANK_STATUSES } from "@/lib/problem-bank/filters";
import { setBankStatus } from "@/server/bank";

type Result = { ok: true } | { ok: false; error: string };

const input = z.object({
  problemId: z.number().int().positive(),
  status: z.enum(BANK_STATUSES).nullable(),
});

/** Records a self-reported status for a problem bank entry (null clears it). */
export async function setBankStatusAction(raw: {
  problemId: number;
  status: string | null;
}): Promise<Result> {
  try {
    const { problemId, status } = input.parse(raw);
    await setBankStatus(problemId, status);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof z.ZodError
          ? err.issues.map((i) => i.message).join("; ")
          : err instanceof Error
            ? err.message
            : "Unexpected error",
    };
  }
}
