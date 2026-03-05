import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePortalAccess, isPortalError } from "@/lib/portalAuth";
import type { DonationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set<string>(["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ nonprofitId: string }> }
) {
  const { nonprofitId } = await params;

  const auth = await requirePortalAccess(req, nonprofitId);
  if (isPortalError(auth)) return auth;

  const { searchParams } = new URL(req.url);

  const statusParam = searchParams.get("status");
  const campaignId = searchParams.get("campaignId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const exportFormat = searchParams.get("export");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)));

  const status =
    statusParam && VALID_STATUSES.has(statusParam)
      ? (statusParam as DonationStatus)
      : undefined;

  const where = {
    nonprofitId,
    ...(status ? { status } : {}),
    ...(campaignId ? { campaignId } : {}),
    ...((from || to)
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const selectFields = {
    id: true,
    amountCents: true,
    currency: true,
    status: true,
    donatedAt: true,
    createdAt: true,
    campaignId: true,
    campaign: { select: { title: true } },
    user: { select: { name: true, email: true, username: true } },
  };

  // CSV export: fetch all matching records (no pagination, max 10000)
  if (exportFormat === "csv") {
    const donations = await prisma.donation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10000,
      select: selectFields,
    });

    const dateStr = new Date().toISOString().split("T")[0];
    const header = "Date,Donor Name,Donor Email,Amount,Currency,Status,Campaign";
    const rows = donations.map((d) => {
      const date = d.donatedAt ?? d.createdAt;
      const dateFormatted = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const donorName = d.user?.name ?? "Anonymous";
      const donorEmail = d.user?.email ?? "";
      const amount = (d.amountCents / 100).toFixed(2);
      const currency = d.currency.toUpperCase();
      const campaignTitle = d.campaign?.title ?? "";

      // Sanitize CSV cell: prevent formula injection and handle quoting
      const csvCell = (val: string) => {
        const dangerous = ["=", "+", "-", "@", "\t", "\r"];
        const safe = dangerous.some((c) => val.startsWith(c)) ? `'${val}` : val;
        return `"${safe.replace(/"/g, '""')}"`;
      };

      return [
        csvCell(dateFormatted),
        csvCell(donorName),
        csvCell(donorEmail),
        csvCell(amount),
        csvCell(currency),
        csvCell(d.status),
        csvCell(campaignTitle),
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="donations-${nonprofitId}-${dateStr}.csv"`,
      },
    });
  }

  // Normal JSON response with pagination
  const skip = (page - 1) * limit;

  const [donations, total] = await Promise.all([
    prisma.donation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: selectFields,
    }),
    prisma.donation.count({ where }),
  ]);

  const serialized = donations.map((d) => ({
    id: d.id,
    amountCents: d.amountCents,
    currency: d.currency,
    status: d.status,
    donatedAt: d.donatedAt ? d.donatedAt.toISOString() : null,
    createdAt: d.createdAt.toISOString(),
    campaignId: d.campaignId,
    campaignTitle: d.campaign?.title ?? null,
    donorName: d.user?.name ?? "Anonymous",
    donorEmail: d.user?.email ?? null,
    donorUsername: d.user?.username ?? null,
  }));

  return NextResponse.json({ donations: serialized, total });
}
