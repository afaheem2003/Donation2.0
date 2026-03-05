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
  const currentYear = new Date().getFullYear();
  const year = yearParam ? parseInt(yearParam, 10) : currentYear;
  if (isNaN(year) || year < 2000 || year > currentYear) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

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

  // Sanitize a CSV cell: quote it and prevent formula injection.
  // Cells starting with =, +, -, @, tab, or CR would execute as formulas in
  // Excel/Sheets when the file is opened.
  function csvCell(value: string): string {
    const dangerous = ["=", "+", "-", "@", "\t", "\r"];
    const safe = dangerous.some((c) => value.startsWith(c)) ? `'${value}` : value;
    // Always quote to handle commas and newlines in org names.
    return `"${safe.replace(/"/g, '""')}"`;
  }

  const rows = [
    ["Date", "Nonprofit", "EIN", "Amount (USD)", "Receipt #", "Status"],
    ...donations.map((d) => [
      csvCell(d.donatedAt ? new Date(d.donatedAt).toISOString().split("T")[0] : ""),
      csvCell(d.nonprofit.name),
      csvCell(d.nonprofit.ein),
      csvCell((d.amountCents / 100).toFixed(2)),
      csvCell(d.receipt?.receiptNumber ?? ""),
      csvCell(d.status),
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
