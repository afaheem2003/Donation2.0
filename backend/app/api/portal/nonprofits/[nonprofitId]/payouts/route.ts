import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePortalAccess, isPortalError } from "@/lib/portalAuth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ nonprofitId: string }> }
) {
  const { nonprofitId } = await params;

  const auth = await requirePortalAccess(req, nonprofitId);
  if (isPortalError(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const [payouts, total] = await Promise.all([
    prisma.payout.findMany({
      where: { nonprofitId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        amountCents: true,
        currency: true,
        status: true,
        arrivalDate: true,
        description: true,
        failureMessage: true,
        createdAt: true,
      },
    }),
    prisma.payout.count({ where: { nonprofitId } }),
  ]);

  const serialized = payouts.map((p) => ({
    ...p,
    arrivalDate: p.arrivalDate ? p.arrivalDate.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  }));

  return NextResponse.json({ payouts: serialized, total });
}
