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
    hasNonprofitAccess: boolean;
    onboardingComplete: boolean;
    interests: string[];
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
    // Reject tokens that are clearly malformed — prevents arbitrary-length DB queries
    if (token && token.length <= 512) {
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
              onboardingComplete: true,
              interests: true,
            },
          },
        },
      });
      if (dbSession && dbSession.expires > new Date() && dbSession.user) {
        const u = dbSession.user;
        const nonprofitCount = await prisma.nonprofitAdmin.count({ where: { userId: u.id } });
        return {
          user: {
            id: u.id,
            name: u.name,
            email: u.email,
            image: u.avatarUrl,
            username: u.username,
            usernameSet: u.usernameSet,
            role: String(u.role),
            hasNonprofitAccess: nonprofitCount > 0,
            onboardingComplete: u.onboardingComplete,
            interests: u.interests as string[],
          },
        };
      }
    }
  }


  // 2. Fall back to NextAuth cookie session (web browser)
  const session = await auth();
  if (!session?.user) return null;
  return {
    user: {
      id: session.user.id,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      image: session.user.image ?? null,
      username: session.user.username ?? "",
      role: session.user.role ?? "DONOR",
      usernameSet: session.user.usernameSet ?? false,
      hasNonprofitAccess: session.user.hasNonprofitAccess ?? false,
      onboardingComplete: session.user.onboardingComplete ?? false,
      interests: (session.user.interests as string[]) ?? [],
    },
  };
}
