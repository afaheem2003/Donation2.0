import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";

// NOTE: This route uses prisma.nonprofitApplication — the model must exist in schema.prisma.
// The NonprofitApplication model is being added by a concurrent schema migration agent.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

  const VALID_STATUSES = ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"];
  const where: Record<string, unknown> = {};
  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }
    where.status = status;
  }

  const [applications, total] = await Promise.all([
    prisma.nonprofitApplication.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orgName: true,
        ein: true,
        category: true,
        status: true,
        submittedByEmail: true,
        submittedByName: true,
        createdAt: true,
        reviewedAt: true,
        isClaim: true,
      },
    }),
    prisma.nonprofitApplication.count({ where }),
  ]);

  return NextResponse.json({ applications, total, page, limit });
}
