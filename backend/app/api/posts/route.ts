import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  nonprofitId: z.string(),
  donationId: z.string().optional(),
  caption: z.string().min(1).max(2200),
  imageUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { nonprofitId, donationId, caption, imageUrl } = parsed.data;

  // Verify nonprofit exists
  const nonprofit = await prisma.nonprofit.findUnique({ where: { id: nonprofitId } });
  if (!nonprofit) {
    return NextResponse.json({ error: "Nonprofit not found" }, { status: 404 });
  }

  // If donationId provided, verify it belongs to the user
  if (donationId) {
    const donation = await prisma.donation.findFirst({
      where: { id: donationId, userId: session.user.id, status: "SUCCEEDED" },
    });
    if (!donation) {
      return NextResponse.json({ error: "Donation not found or not eligible" }, { status: 400 });
    }
  }

  const post = await prisma.post.create({
    data: {
      userId: session.user.id,
      nonprofitId,
      donationId,
      caption,
      imageUrl,
    },
    include: {
      user: { select: { id: true, name: true, username: true, avatarUrl: true } },
      nonprofit: { select: { id: true, name: true, logoUrl: true, verified: true } },
    },
  });

  return NextResponse.json(post, { status: 201 });
}
