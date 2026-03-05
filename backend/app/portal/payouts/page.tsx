import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StripeConnectBanner } from "@/components/portal/StripeConnectBanner";
import { PayoutsPanel } from "@/components/portal/PayoutsPanel";

export default async function PayoutsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/portal/payouts");
  }

  const adminRecord = await prisma.nonprofitAdmin.findFirst({
    where: { userId: session.user.id },
    select: { nonprofitId: true },
  });

  if (!adminRecord) {
    redirect("/portal/apply");
  }

  const { nonprofitId } = adminRecord;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Payouts</h1>
        <p className="text-sm text-gray-500 mt-0.5">Stripe Connect payouts to your bank account.</p>
      </div>
      <StripeConnectBanner nonprofitId={nonprofitId} />
      <PayoutsPanel nonprofitId={nonprofitId} />
    </div>
  );
}
