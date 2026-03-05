import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";
import type { AdminRole } from "@prisma/client";

export type PortalSession = {
  session: { user: { id: string; username: string; role: string; email?: string | null } };
  adminRole: AdminRole;
};

export async function requirePortalAccess(
  req: NextRequest,
  nonprofitId: string,
  requiredRole?: "OWNER"
): Promise<PortalSession | NextResponse> {
  const session = await getSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminRecord = await prisma.nonprofitAdmin.findUnique({
    where: { userId_nonprofitId: { userId: session.user.id, nonprofitId } },
    select: { role: true },
  });

  if (!adminRecord) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (requiredRole === "OWNER" && adminRecord.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden: owner required" }, { status: 403 });
  }

  return { session: session as PortalSession["session"], adminRole: adminRecord.role };
}

export function isPortalError(result: PortalSession | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
