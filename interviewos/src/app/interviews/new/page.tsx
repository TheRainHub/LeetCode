import { redirect } from "next/navigation";

/** Plan tasks link here; the setup form lives on /interviews. */
export default async function NewInterviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams(
    Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string"),
  );
  redirect(`/interviews${q.size ? `?${q.toString()}` : ""}`);
}
