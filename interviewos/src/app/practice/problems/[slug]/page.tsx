import { notFound } from "next/navigation";
import { Workspace } from "@/components/practice/workspace";
import { getWorkspace } from "@/server/practice";
import { getSettings } from "@/server/user";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " ") };
}

export default async function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [data, settings] = await Promise.all([getWorkspace(slug), getSettings()]);
  if (!data) notFound();
  return <Workspace data={data} defaultLanguage={settings.preferredLanguage} theme={settings.theme} />;
}
