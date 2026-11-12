"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { setGuideRead } from "@/server/guides";

/** Marks a visual guide as read or unread (self-reported). */
export async function setGuideReadAction(input: {
  slug: string;
  read: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const data = z.object({ slug: z.string().regex(/^[a-z0-9-]{1,200}$/), read: z.boolean() }).parse(input);
    await setGuideRead(data.slug, data.read);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}
