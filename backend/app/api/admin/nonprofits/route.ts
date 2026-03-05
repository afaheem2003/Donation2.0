import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PLATFORM_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const verified = searchParams.get("verified");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { ein: { contains: q } },
    ];
  }
  if (verified === "true") where.verified = true;
  if (verified === "false") where.verified = false;

  const [nonprofits, total] = await Promise.all([
    prisma.nonprofit.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        ein: true,
        category: true,
        verified: true,
        createdAt: true,
        _count: { select: { donations: true, followers: true } },
      },
    }),
    prisma.nonprofit.count({ where }),
  ]);

  return NextResponse.json({ nonprofits, total, page, limit });
}
