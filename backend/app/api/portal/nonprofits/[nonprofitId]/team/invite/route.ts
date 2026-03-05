import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePortalAccess, isPortalError } from "@/lib/portalAuth";
import * as React from "react";
import { sendEmail } from "@/lib/email";
import { TeamInviteEmail } from "@/emails/TeamInviteEmail";

export const dynamic = "force-dynamic";

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "OWNER"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ nonprofitId: string }> }
) {
  const { nonprofitId } = await params;

  // Only OWNER role can invite
  const auth = await requirePortalAccess(req, nonprofitId, "OWNER");
  if (isPortalError(auth)) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { email, role } = parsed.data;

  // Prevent self-invite — avoids role manipulation via invite accept upsert
  if (email.toLowerCase() === auth.session.user.email?.toLowerCase()) {
    return NextResponse.json({ error: "You cannot invite yourself" }, { status: 422 });
  }

  // Check if user is already an admin of this nonprofit
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    const existingAdmin = await prisma.nonprofitAdmin.findUnique({
      where: {
        userId_nonprofitId: {
          userId: existingUser.id,
          nonprofitId,
        },
      },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: "User is already an admin of this nonprofit" },
        { status: 409 }
      );
    }
  }

  // Check if a pending invite already exists for this email
  const existingInvite = await prisma.adminInvite.findUnique({
    where: { nonprofitId_email: { nonprofitId, email } },
  });

  if (existingInvite && existingInvite.acceptedAt === null && existingInvite.expiresAt > new Date()) {
    return NextResponse.json(
      { error: "A pending invite already exists for this email" },
      { status: 409 }
    );
  }

  // Delete any expired/accepted invite for this email before creating new one
  if (existingInvite) {
    await prisma.adminInvite.delete({
      where: { nonprofitId_email: { nonprofitId, email } },
    });
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const token = randomBytes(32).toString("hex");

  const invite = await prisma.adminInvite.create({
    data: {
      nonprofitId,
      email,
      role,
      token,
      invitedByUserId: auth.session.user.id,
      expiresAt,
    },
    select: {
      id: true,
      token: true,
      email: true,
      role: true,
    },
  });

  // Fetch nonprofit name and inviter name for the email
  try {
    const [nonprofit, inviter] = await Promise.all([
      prisma.nonprofit.findUnique({ where: { id: nonprofitId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: auth.session.user.id }, select: { name: true } }),
    ]);
    const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://givestream.org"}/portal/invite/${invite.token}`;
    await sendEmail({
      to: email,
      subject: `You've been invited to manage ${nonprofit?.name ?? "a nonprofit"} on GiveStream`,
      react: React.createElement(TeamInviteEmail, {
        invitedByName: inviter?.name ?? "A team member",
        nonprofitName: nonprofit?.name ?? "the organization",
        role,
        acceptUrl,
        expiresAt,
      }),
    });
  } catch (emailErr) {
    console.error("Invite email failed:", emailErr);
  }

  return NextResponse.json(
    {
      inviteId: invite.id,
      token: invite.token,
      email: invite.email,
      role: invite.role,
    },
    { status: 201 }
  );
}
