import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AnalyticsDashboard } from "@/components/portal/AnalyticsDashboard";

export default async function PortalAnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/portal/analytics");

  const adminRecord = await prisma.nonprofitAdmin.findFirst({
    where: { userId: session.user.id },
    select: { nonprofitId: true },
  });

  if (!adminRecord) redirect("/portal/apply");

  const nonprofitId = adminRecord.nonprofitId;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Insights into your fundraising performance.
        </p>
      </div>
      <AnalyticsDashboard nonprofitId={nonprofitId} />
    </div>
  );
}
