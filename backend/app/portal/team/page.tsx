import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TeamManager } from "@/components/portal/TeamManager";

export default async function PortalTeamPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/portal/team");

  const adminRecord = await prisma.nonprofitAdmin.findFirst({
    where: { userId: session.user.id },
    select: { nonprofitId: true },
  });

  if (!adminRecord) redirect("/portal/apply");

  return <TeamManager nonprofitId={adminRecord.nonprofitId} />;
}
