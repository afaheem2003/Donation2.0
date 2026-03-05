// GET /api/auth/ein-lookup?ein=XX-XXXXXXX
// Public endpoint (no auth required)
// Returns one of:
//   { status: "not_found" }
//   { status: "unclaimed", nonprofit: { id, name, category, description, logoUrl, website } }
//   { status: "claimed", nonprofit: { name } }
//   { status: "pending", nonprofit: { name } }  ← has a pending/under_review claim application

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ein = req.nextUrl.searchParams.get("ein")?.trim();
  if (!ein) return NextResponse.json({ error: "ein required" }, { status: 400 });
  if (!/^\d{2}-\d{7}$/.test(ein)) return NextResponse.json({ error: "Invalid EIN format" }, { status: 400 });

  const nonprofit = await prisma.nonprofit.findUnique({
    where: { ein },
    select: { id: true, name: true, category: true, description: true, logoUrl: true, website: true },
  });
  // Note: `id` is selected internally for claim lookup but NOT returned in unclaimed responses.

  if (!nonprofit) return NextResponse.json({ status: "not_found" });

  // Check if already has an admin
  const adminCount = await prisma.nonprofitAdmin.count({ where: { nonprofitId: nonprofit.id } });
  if (adminCount > 0) return NextResponse.json({ status: "claimed", nonprofit: { name: nonprofit.name } });

  // Check for a pending claim application
  const pendingClaim = await prisma.nonprofitApplication.findFirst({
    where: { nonprofitId: nonprofit.id, status: { in: ["PENDING", "UNDER_REVIEW"] }, isClaim: true },
    select: { id: true },
  });
  if (pendingClaim) return NextResponse.json({ status: "pending", nonprofit: { name: nonprofit.name } });

  // Exclude internal `id` from public response — claim route uses EIN for lookup
  const { id: _id, ...publicNonprofit } = nonprofit;
  return NextResponse.json({ status: "unclaimed", nonprofit: publicNonprofit });
}
