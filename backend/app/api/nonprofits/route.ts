import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const VALID_CATEGORIES = [
    "EDUCATION", "HEALTH", "ENVIRONMENT", "ARTS",
    "HUMAN_SERVICES", "ANIMALS", "INTERNATIONAL", "RELIGION",
    "COMMUNITY", "OTHER",
  ];

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 12;

  if (category && !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
        { ein: { contains: search } },
      ],
    }),
    ...(category && { category: category as never }),
  };

  const [nonprofits, total] = await Promise.all([
    prisma.nonprofit.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ verified: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        ein: true,
        description: true,
        category: true,
        website: true,
        logoUrl: true,
        verified: true,
        latitude: true,
        longitude: true,
        _count: { select: { donations: { where: { status: "SUCCEEDED" } } } },
      },
    }),
    prisma.nonprofit.count({ where }),
  ]);

  return NextResponse.json({ nonprofits, total, page, pages: Math.ceil(total / limit) });
}
