import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export interface AppSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    username: string;
    role: string;
    usernameSet: boolean;
  };
}

/**
 * Resolves the current session for a request.
 *
 * Mobile app sends:  Authorization: Bearer <sessionToken>
 * Browser sends:     NextAuth cookie (handled by auth())
 *
 * iOS injects stale system cookies into fetch requests, so we can't
 * rely on the Cookie header from the mobile app. Bearer token bypasses this.
 */
export async function getSession(req: NextRequest): Promise<AppSession | null> {
  // 1. Try Authorization: Bearer <token> (mobile app)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const dbSession = await prisma.session.findUnique({
        where: { sessionToken: token },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              usernameSet: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
      });
      if (dbSession && dbSession.expires > new Date() && dbSession.user) {
        const u = dbSession.user;
        return {
          user: {
            id: u.id,
            name: u.name,
            email: u.email,
            image: u.avatarUrl,
            username: u.username,
            usernameSet: u.usernameSet,
            role: String(u.role),
          },
        };
      }
    }
  }

  // 2. Fall back to NextAuth cookie session (web browser)
  const session = await auth();
  if (!session?.user) return null;
  const u = session.user as {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    username?: string;
    role?: string;
    usernameSet?: boolean;
  };
  return {
    user: {
      id: u.id,
      name: u.name ?? null,
      email: u.email ?? null,
      image: u.image ?? null,
      username: u.username ?? "",
      role: u.role ?? "DONOR",
      usernameSet: u.usernameSet ?? false,
    },
  };
}
