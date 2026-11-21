"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { describeAiError } from "@/lib/ai/client";
import { isAiConfigured } from "@/lib/ai/config";
import { analyzePosting, importPosting, PostingImportError, researchCompany } from "@/lib/ai/jobs";
import { careerProfileSchema, JOB_STATUSES, MIN_RESUME_CHARS, postingInputSchema } from "@/lib/jobs/model";
import { createInterview } from "@/server/interviews";
import {
  createPosting,
  deletePosting,
  findPostingByUrl,
  getCareerProfile,
  getPosting,
  getPreparationContext,
  getSearch,
  resumeFingerprint,
  saveAnalysis,
  saveCareerProfile,
  setPostingStatus,
  updatePosting,
} from "@/server/jobs";
import { log } from "@/server/log";
import { getSettings } from "@/server/user";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };
const fail = (err: unknown): { ok: false; error: string } =>
  err instanceof z.ZodError
    ? { ok: false, error: err.issues.map((i) => i.message).join("; ") }
    : { ok: false, error: err instanceof Error ? err.message : "Unexpected error" };
const aiFail = (err: unknown): { ok: false; error: string } =>
  err instanceof z.ZodError || err instanceof PostingImportError
    ? fail(err)
    : { ok: false, error: describeAiError(err) };

const id = z.number().int().positive();
const refresh = (postingId?: number) => {
  revalidatePath("/jobs");
  if (postingId) revalidatePath(`/jobs/${postingId}`);
};

export async function saveProfileAction(input: unknown): Promise<Result> {
  try {
    await saveCareerProfile(careerProfileSchema.parse(input));
    revalidatePath("/jobs", "layout");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function createPostingAction(input: unknown): Promise<Result<{ id: number }>> {
  try {
    const postingId = await createPosting(postingInputSchema.parse(input), "manual");
    refresh();
    return { ok: true, data: { id: postingId } };
  } catch (err) {
    return fail(err);
  }
}

export async function updatePostingAction(input: { id: number; posting: unknown }): Promise<Result> {
  try {
    const postingId = id.parse(input.id);
    await updatePosting(postingId, postingInputSchema.parse(input.posting));
    refresh(postingId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setPostingStatusAction(input: { id: number; status: string }): Promise<Result> {
  try {
    const postingId = id.parse(input.id);
    await setPostingStatus(postingId, z.enum(JOB_STATUSES).parse(input.status));
    refresh(postingId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deletePostingAction(input: { id: number }): Promise<Result> {
  try {
    await deletePosting(id.parse(input.id));
  } catch (err) {
    return fail(err);
  }
  refresh();
  redirect("/jobs");
}

const requireAi = () => {
  if (!isAiConfigured()) throw new Error("AI is not configured: set ANTHROPIC_API_KEY on the server.");
};

/** Reads a posting from its link (via the model's web fetch tool) and saves it. */
export async function importPostingAction(input: { url: string }): Promise<Result<{ id: number }>> {
  try {
    requireAi();
    const url = postingInputSchema.shape.url.unwrap().parse(input.url);
    const existing = await findPostingByUrl(url);
    if (existing) return { ok: true, data: { id: existing.id } };
    const p = await importPosting(url);
    const postingId = await createPosting(
      postingInputSchema.parse({ ...p, url, notes: "", description: p.description.slice(0, 40_000) }),
      "url",
    );
    log.info("jobs", "imported posting", { id: postingId });
    refresh();
    return { ok: true, data: { id: postingId } };
  } catch (err) {
    log.warn("jobs", "import failed", { error: describeAiError(err) });
    return aiFail(err);
  }
}

/** Fills in a saved posting's text from its link (for postings saved from search results). */
export async function fetchPostingTextAction(input: { id: number }): Promise<Result> {
  try {
    requireAi();
    const postingId = id.parse(input.id);
    const data = await getPosting(postingId);
    if (!data) throw new Error("Posting not found");
    if (!data.posting.url) throw new Error("This posting has no link.");
    const p = await importPosting(data.posting.url);
    const { posting } = data;
    await updatePosting(
      postingId,
      postingInputSchema.parse({
        title: posting.title || p.title,
        company: posting.company || p.company,
        location: posting.location || p.location,
        workMode: posting.workMode ?? p.workMode,
        url: posting.url,
        description: p.description.slice(0, 40_000),
        notes: posting.notes,
      }),
    );
    refresh(postingId);
    return { ok: true };
  } catch (err) {
    return aiFail(err);
  }
}

/** Saves one result of an AI job search as a posting. */
export async function saveFoundJobAction(input: {
  searchId: number;
  index: number;
}): Promise<Result<{ id: number }>> {
  try {
    const search = await getSearch(id.parse(input.searchId));
    const job = search?.results[z.number().int().min(0).parse(input.index)];
    if (!search || !job) throw new Error("Search result not found");
    const found = new Date(search.createdAt).toISOString().slice(0, 10);
    const notes = [
      `Found by AI web search on ${found}. Check that the posting is still open.`,
      job.summary,
      job.whyFit && `Why it may fit: ${job.whyFit}`,
      job.concerns && `Concerns: ${job.concerns}`,
      job.deadline && `Deadline (as stated): ${job.deadline}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    const postingId = await createPosting(
      postingInputSchema.parse({
        title: job.title,
        company: job.company,
        location: job.location,
        workMode: job.workMode === "unknown" ? null : job.workMode,
        url: job.url,
        description: "",
        notes,
      }),
      "search",
      search.id,
    );
    refresh();
    return { ok: true, data: { id: postingId } };
  } catch (err) {
    return fail(err);
  }
}

/** Résumé-vs-posting analysis, optionally with web research on the company's hiring process. */
export async function analyzePostingAction(input: { id: number; research: boolean }): Promise<Result> {
  try {
    requireAi();
    const postingId = id.parse(input.id);
    const [data, profile, context] = await Promise.all([
      getPosting(postingId),
      getCareerProfile(),
      getPreparationContext(),
    ]);
    if (!data) throw new Error("Posting not found");
    if (profile.resume.trim().length < MIN_RESUME_CHARS)
      throw new Error("Add your résumé in Job search → Profile first.");
    if (data.posting.description.trim().length < 200)
      throw new Error("Add the posting's full text first (paste it, or fetch it from the link).");
    const research = input.research
      ? await researchCompany({ company: data.posting.company, title: data.posting.title })
      : null;
    const { analysis, droppedRewrites } = await analyzePosting({
      profile,
      posting: data.posting,
      ...context,
      research,
    });
    await saveAnalysis({
      postingId,
      data: analysis,
      sources: research?.sources ?? [],
      researched: Boolean(research),
      resumeHash: await resumeFingerprint(profile.resume),
      droppedRewrites,
    });
    if (data.posting.status === "saved") await setPostingStatus(postingId, "preparing");
    log.info("jobs", "analysed posting", { id: postingId, score: analysis.fit.score, droppedRewrites });
    refresh(postingId);
    return { ok: true };
  } catch (err) {
    log.warn("jobs", "analysis failed", { error: describeAiError(err) });
    return aiFail(err);
  }
}

const INTERVIEW_TYPES = ["algorithms", "backend", "fullstack", "system_design", "behavioral"] as const;

/** Mock interview tailored to a posting (the interviewer sees the posting text). */
export async function startJobInterviewAction(input: {
  id: number;
  type: string;
}): Promise<{ ok: false; error: string } | never> {
  if (!isAiConfigured())
    return { ok: false, error: "AI is not configured. Set ANTHROPIC_API_KEY on the server." };
  const parsed = z.object({ id, type: z.enum(INTERVIEW_TYPES) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request" };
  const data = await getPosting(parsed.data.id);
  if (!data) return { ok: false, error: "Posting not found" };
  const settings = await getSettings();
  const interviewId = await createInterview({
    companySlug: data.posting.companySlug,
    type: parsed.data.type,
    difficulty: "medium",
    durationMinutes: 45,
    language: settings.preferredLanguage,
    jobPostingId: data.posting.id,
  });
  revalidatePath("/interviews");
  redirect(`/interviews/${interviewId}`);
}
