import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";

// NOTE: This route uses prisma.adminInvite — the model must exist in schema.prisma.
// The AdminInvite model is being added by a concurrent schema migration agent.

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await getSession(req);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;

  const invite = await prisma.adminInvite.findUnique({
    where: { token },
    select: {
      id: true,
      email: true,
      role: true,
      nonprofitId: true,
      expiresAt: true,
      acceptedAt: true,
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.acceptedAt !== null) {
    return NextResponse.json({ error: "Invite has already been accepted" }, { status: 409 });
  }

  const now = new Date();
  if (invite.expiresAt <= now) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
  }

  // Verify that the authenticated user's email matches the invite email
  const currentUserEmail = session.user.email ?? "";
  if (currentUserEmail.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json(
      { error: "This invite was issued to a different email address" },
      { status: 403 }
    );
  }

  const userId = session.user.id;
  const nonprofitId = invite.nonprofitId;

  // Create the NonprofitAdmin record (upsert to be safe)
  await prisma.nonprofitAdmin.upsert({
    where: {
      userId_nonprofitId: { userId, nonprofitId },
    },
    create: {
      userId,
      nonprofitId,
      role: invite.role,
    },
    update: {
      role: invite.role,
    },
  });

  // Mark invite as accepted
  await prisma.adminInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: now },
  });

  return NextResponse.json({ nonprofitId, role: invite.role });
}
