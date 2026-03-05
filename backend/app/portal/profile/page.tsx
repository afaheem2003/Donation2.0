import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileEditor } from "@/components/portal/ProfileEditor";

export default async function PortalProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/portal/profile");

  const adminRecord = await prisma.nonprofitAdmin.findFirst({
    where: { userId: session.user.id },
    select: {
      nonprofitId: true,
      nonprofit: {
        select: {
          id: true,
          name: true,
          description: true,
          website: true,
          category: true,
          logoUrl: true,
          verified: true,
        },
      },
    },
  });

  if (!adminRecord) redirect("/portal/apply");

  return <ProfileEditor nonprofit={adminRecord.nonprofit} />;
}
