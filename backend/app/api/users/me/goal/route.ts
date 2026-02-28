import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

function getYearRange() {
  const year = new Date().getFullYear();
  return { year, startOfYear: new Date(year, 0, 1) };
}

async function goalResponse(userId: string) {
  const { year, startOfYear } = getYearRange();
  const [user, agg] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { yearlyGoalCents: true },
    }),
    prisma.donation.aggregate({
      where: { userId, status: "SUCCEEDED", donatedAt: { gte: startOfYear } },
      _sum: { amountCents: true },
    }),
  ]);
  return {
    yearlyGoalCents: user?.yearlyGoalCents ?? null,
    totalDonatedThisYearCents: agg._sum.amountCents ?? 0,
    year,
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await goalResponse(session.user.id));
}

const schema = z.object({
  yearlyGoalCents: z.number().int().min(100).max(100_000_000),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { yearlyGoalCents: parsed.data.yearlyGoalCents },
  });

  return NextResponse.json(await goalResponse(session.user.id));
}
