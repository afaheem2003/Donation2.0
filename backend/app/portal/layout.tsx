import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { PortalShell } from "@/components/portal/PortalShell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/portal/dashboard");

  const adminRecord = await prisma.nonprofitAdmin.findFirst({
    where: { userId: session.user.id },
    select: {
      nonprofitId: true,
      nonprofit: { select: { name: true, description: true } },
    },
  });

  if (!adminRecord) redirect("/portal/apply");

  // Redirect to onboarding if the nonprofit profile is incomplete (no description),
  // but only when we are NOT already on the onboarding path to prevent a redirect loop.
  const headersList = await headers();
  const pathname = headersList.get("next-url") ?? "";
  const isOnboarding = pathname.includes("/portal/onboarding");

  if (!adminRecord.nonprofit.description && !isOnboarding) {
    redirect("/portal/onboarding");
  }

  const orgName = adminRecord.nonprofit.name;
  return <PortalShell orgName={orgName}>{children}</PortalShell>;
}
