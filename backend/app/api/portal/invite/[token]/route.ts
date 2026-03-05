import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// NOTE: This route uses prisma.adminInvite — the model must exist in schema.prisma.
// The AdminInvite model is being added by a concurrent schema migration agent.

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invite = await prisma.adminInvite.findUnique({
    where: { token },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      nonprofit: {
        select: { name: true },
      },
    },
  });

  if (!invite) {
    return NextResponse.json(
      { valid: false, expired: false, nonprofitName: null, email: null, role: null },
      { status: 404 }
    );
  }

  const now = new Date();
  const expired = invite.expiresAt <= now;
  const alreadyAccepted = invite.acceptedAt !== null;
  const valid = !expired && !alreadyAccepted;

  return NextResponse.json({
    valid,
    expired,
    alreadyAccepted,
    nonprofitName: invite.nonprofit.name,
    email: invite.email,
    role: invite.role,
  });
}
