import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

  const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
  const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const donations = await prisma.donation.findMany({
    where: {
      userId: session.user.id,
      status: "SUCCEEDED",
      donatedAt: { gte: startDate, lt: endDate },
    },
    include: {
      nonprofit: { select: { name: true, ein: true } },
      receipt: { select: { receiptNumber: true } },
    },
    orderBy: { donatedAt: "asc" },
  });

  const rows = [
    ["Date", "Nonprofit", "EIN", "Amount (USD)", "Receipt #", "Status"],
    ...donations.map((d) => [
      d.donatedAt ? new Date(d.donatedAt).toISOString().split("T")[0] : "",
      `"${d.nonprofit.name}"`,
      d.nonprofit.ein,
      (d.amountCents / 100).toFixed(2),
      d.receipt?.receiptNumber ?? "",
      d.status,
    ]),
  ];

  const csv = rows.map((row) => row.join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="donations-${year}.csv"`,
    },
  });
}
