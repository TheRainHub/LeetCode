import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PracticeTabs } from "@/components/practice/practice-tabs";
import { SdSubnav } from "@/components/system-design/sd-subnav";
import { Whiteboard } from "@/components/whiteboard/whiteboard";
import { getGuidesOverview } from "@/server/guides";
import { getDueCards, getDueProblems } from "@/server/srs";
import { getI18n } from "@/server/user";
import { getBoard, SANDBOX_BOARD } from "@/server/whiteboard";

export const metadata = { title: "Whiteboard" };

export default async function WhiteboardSandboxPage() {
  const [{ m }, saved, overview, dueCards, dueProblems] = await Promise.all([
    getI18n(),
    getBoard(SANDBOX_BOARD),
    getGuidesOverview(),
    getDueCards(500),
    getDueProblems(),
  ]);
  const W = m.whiteboard;
  return (
    <PageContainer className="max-w-[1680px]">
      <PageHeader title={W.sandboxTitle} description={W.sandboxDescription} />
      <PracticeTabs current="systemDesign" reviewDue={dueCards.length + dueProblems.length} />
      <SdSubnav current="whiteboard" labels={m.sd.guides.nav} guideCount={overview.total || undefined} />
      <Whiteboard boardKey={SANDBOX_BOARD} initialBoard={saved?.board ?? null} />
    </PageContainer>
  );
}
