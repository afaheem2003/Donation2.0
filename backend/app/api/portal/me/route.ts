import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminRecords = await prisma.nonprofitAdmin.findMany({
    where: { userId: session.user.id },
    select: {
      role: true,
      nonprofit: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          verified: true,
          stripeConnect: { select: { status: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const nonprofits = adminRecords.map((record) => ({
    id: record.nonprofit.id,
    name: record.nonprofit.name,
    logoUrl: record.nonprofit.logoUrl,
    role: record.role,
    verified: record.nonprofit.verified,
    stripeConnectStatus: record.nonprofit.stripeConnect?.status ?? "NOT_CONNECTED",
  }));

  return NextResponse.json({ nonprofits });
}
