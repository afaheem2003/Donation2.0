import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DonationTable } from "@/components/portal/DonationTable";

export const dynamic = "force-dynamic";

export default async function DonationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/portal/donations");

  const adminRecord = await prisma.nonprofitAdmin.findFirst({
    where: { userId: session.user.id },
    select: { nonprofitId: true },
  });

  if (!adminRecord) redirect("/portal/apply");

  const { nonprofitId } = adminRecord;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Donations</h1>
        <p className="text-sm text-gray-500 mt-0.5">All donations to your organization.</p>
      </div>
      <DonationTable nonprofitId={nonprofitId} />
    </div>
  );
}
