import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePortalAccess, isPortalError } from "@/lib/portalAuth";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  role: z.enum(["ADMIN", "OWNER"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ nonprofitId: string; adminId: string }> }
) {
  const { nonprofitId, adminId } = await params;

  const auth = await requirePortalAccess(req, nonprofitId, "OWNER");
  if (isPortalError(auth)) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { role } = parsed.data;

  // Fetch the target admin record
  const targetAdmin = await prisma.nonprofitAdmin.findUnique({
    where: { id: adminId },
    select: { id: true, userId: true, nonprofitId: true },
  });

  if (!targetAdmin || targetAdmin.nonprofitId !== nonprofitId) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }

  // Cannot change your own role
  if (targetAdmin.userId === auth.session.user.id) {
    return NextResponse.json(
      { error: "You cannot change your own role" },
      { status: 400 }
    );
  }

  const updated = await prisma.nonprofitAdmin.update({
    where: { id: adminId },
    data: { role },
    select: {
      id: true,
      userId: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ nonprofitId: string; adminId: string }> }
) {
  const { nonprofitId, adminId } = await params;

  const auth = await requirePortalAccess(req, nonprofitId, "OWNER");
  if (isPortalError(auth)) return auth;

  // Fetch the target admin record
  const targetAdmin = await prisma.nonprofitAdmin.findUnique({
    where: { id: adminId },
    select: { id: true, userId: true, nonprofitId: true, role: true },
  });

  if (!targetAdmin || targetAdmin.nonprofitId !== nonprofitId) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }

  // Cannot remove yourself
  if (targetAdmin.userId === auth.session.user.id) {
    return NextResponse.json(
      { error: "You cannot remove yourself" },
      { status: 400 }
    );
  }

  // Cannot remove the last OWNER
  if (targetAdmin.role === "OWNER") {
    const ownerCount = await prisma.nonprofitAdmin.count({
      where: { nonprofitId, role: "OWNER" },
    });

    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last owner" },
        { status: 400 }
      );
    }
  }

  await prisma.nonprofitAdmin.delete({ where: { id: adminId } });

  return NextResponse.json({ success: true });
}
