import { JobsSubnav } from "@/components/jobs/jobs-subnav";
import { ProfileForm } from "@/components/jobs/profile-form";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { getCareerProfile } from "@/server/jobs";
import { getI18n } from "@/server/user";

export const metadata = { title: "Profile & résumé" };

export default async function JobsProfilePage() {
  const [{ m }, profile] = await Promise.all([getI18n(), getCareerProfile()]);
  const { updatedAt: _u, ...initial } = profile;
  return (
    <PageContainer>
      <PageHeader title={m.jobs.title} description={m.jobs.profile.description} />
      <JobsSubnav current="profile" labels={m.jobs.nav} />
      <Card className="p-4">
        <ProfileForm initial={initial} />
      </Card>
    </PageContainer>
  );
}
