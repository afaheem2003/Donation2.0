import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ── Dev-only guard ────────────────────────────────────────────────────────────
// Requires both NODE_ENV !== production AND a matching DEV_SETUP_SECRET header.
// NODE_ENV alone is not sufficient — staging environments may not set it correctly.
function devOnly(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }
  const secret = process.env.DEV_SETUP_SECRET;
  if (secret) {
    const provided = req.headers.get("x-dev-secret");
    if (!provided || provided !== secret) {
      return NextResponse.json({ error: "Invalid dev secret" }, { status: 403 });
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const guard = devOnly(req);
  if (guard) return guard;

  const body = await req.json() as { action: string; email?: string };
  const { action, email: emailOverride } = body;

  // Allow targeting a user by email from curl (no browser session needed)
  let userId: string;
  if (emailOverride) {
    const targetUser = await prisma.user.findUnique({
      where: { email: emailOverride },
      select: { id: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: `No user found with email: ${emailOverride}` }, { status: 404 });
    }
    userId = targetUser.id;
  } else {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in first or pass {email: '...'} in the body" }, { status: 401 });
    }
    userId = session.user.id;
  }

  // ── make-nonprofit-admin ────────────────────────────────────────────────────
  if (action === "make-nonprofit-admin") {
    // Upsert a test nonprofit
    const nonprofit = await prisma.nonprofit.upsert({
      where: { ein: "99-9999999" },
      update: {},
      create: {
        name: "Test Nonprofit (Dev)",
        ein: "99-9999999",
        description: "A test nonprofit created for local development. Safe to ignore.",
        category: "COMMUNITY",
        website: "https://example.com",
        logoUrl: "https://picsum.photos/seed/devnp/200/200",
        verified: true,
      },
    });

    // Upsert admin record
    await prisma.nonprofitAdmin.upsert({
      where: { userId_nonprofitId: { userId, nonprofitId: nonprofit.id } },
      update: { role: "OWNER" },
      create: { userId, nonprofitId: nonprofit.id, role: "OWNER" },
    });

    // Seed some test donations so the dashboard isn't empty
    const donationCount = await prisma.donation.count({ where: { nonprofitId: nonprofit.id } });
    if (donationCount === 0) {
      const amounts = [1000, 2500, 5000, 10000, 2000, 7500, 500, 3000];
      const daysAgo = [1, 3, 5, 10, 15, 20, 25, 30];
      for (let i = 0; i < amounts.length; i++) {
        const donatedAt = new Date(Date.now() - daysAgo[i] * 24 * 60 * 60 * 1000);
        await prisma.donation.create({
          data: {
            nonprofitId: nonprofit.id,
            amountCents: amounts[i],
            status: "SUCCEEDED",
            donatedAt,
            createdAt: donatedAt,
          },
        });
      }
    }

    // Seed a test campaign
    const campaignCount = await prisma.campaign.count({ where: { nonprofitId: nonprofit.id } });
    if (campaignCount === 0) {
      await prisma.campaign.create({
        data: {
          nonprofitId: nonprofit.id,
          createdByUserId: userId,
          title: "Spring Fundraiser 2025",
          slug: "spring-fundraiser-2025-dev",
          description: "A sample fundraising campaign created for development testing. Raise funds for our community programs.",
          goalCents: 500000,
          raisedCents: 31500,
          donorCount: 8,
          status: "ACTIVE",
          publishedAt: new Date(),
          endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    return NextResponse.json({
      ok: true,
      message: "You are now a nonprofit OWNER for 'Test Nonprofit (Dev)'",
      nonprofitId: nonprofit.id,
      redirect: "/portal/dashboard",
    });
  }

  // ── make-platform-admin ─────────────────────────────────────────────────────
  if (action === "make-platform-admin") {
    await prisma.user.update({
      where: { id: userId },
      data: { role: "PLATFORM_ADMIN" },
    });

    return NextResponse.json({
      ok: true,
      message: "You are now a PLATFORM_ADMIN. You can review nonprofit applications.",
      redirect: "/admin/applications",
    });
  }

  // ── reset ───────────────────────────────────────────────────────────────────
  if (action === "reset") {
    await prisma.user.update({
      where: { id: userId },
      data: { role: "DONOR" },
    });

    return NextResponse.json({
      ok: true,
      message: "Role reset to DONOR. Your admin records still exist but your role is now DONOR.",
      redirect: "/",
    });
  }

  // ── seed-donations ──────────────────────────────────────────────────────────
  if (action === "seed-donations") {
    const adminRecord = await prisma.nonprofitAdmin.findFirst({
      where: { userId },
      select: { nonprofitId: true },
    });

    if (!adminRecord) {
      return NextResponse.json({ error: "Run 'make-nonprofit-admin' first" }, { status: 400 });
    }

    const amounts = [500, 1000, 1500, 2000, 2500, 3000, 5000, 7500, 10000, 15000];
    const daysAgo = [0, 1, 2, 4, 6, 8, 12, 18, 25, 35];

    for (let i = 0; i < amounts.length; i++) {
      const donatedAt = new Date(Date.now() - daysAgo[i] * 24 * 60 * 60 * 1000);
      await prisma.donation.create({
        data: {
          nonprofitId: adminRecord.nonprofitId,
          amountCents: amounts[i],
          status: "SUCCEEDED",
          donatedAt,
          createdAt: donatedAt,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      message: `Seeded ${amounts.length} test donations`,
      redirect: "/portal/donations",
    });
  }

  // ── reset-onboarding ────────────────────────────────────────────────────────
  if (action === "reset-onboarding") {
    const adminRecord = await prisma.nonprofitAdmin.findFirst({
      where: { userId },
      select: { nonprofitId: true },
    });

    if (!adminRecord) {
      return NextResponse.json({ error: "Run 'make-nonprofit-admin' first" }, { status: 400 });
    }

    await prisma.nonprofit.update({
      where: { id: adminRecord.nonprofitId },
      data: { description: "", logoUrl: null, website: null },
    });

    return NextResponse.json({
      ok: true,
      message: "Onboarding reset. Navigate to /portal/dashboard to trigger redirect.",
      redirect: "/portal/dashboard",
    });
  }

  // ── simulate-claim ───────────────────────────────────────────────────────────
  if (action === "simulate-claim") {
    const nonprofit = await prisma.nonprofit.findUnique({
      where: { ein: "13-3433452" },
      select: { id: true, name: true, ein: true, category: true, description: true },
    });

    if (!nonprofit) {
      return NextResponse.json({ error: "Seeded nonprofit not found. Run seed first." }, { status: 404 });
    }

    // Remove existing admins so it's claimable
    await prisma.nonprofitAdmin.deleteMany({ where: { nonprofitId: nonprofit.id } });

    // Remove existing pending claim applications for this nonprofit
    await prisma.nonprofitApplication.deleteMany({
      where: { nonprofitId: nonprofit.id, status: { in: ["PENDING", "UNDER_REVIEW"] } },
    });

    return NextResponse.json({
      ok: true,
      message: `Doctors Without Borders is now claimable. Visit /auth/claim and enter EIN: 13-3433452`,
      redirect: "/auth/claim",
    });
  }

  // ── reset-claim-state ───────────────────────────────────────────────────────
  if (action === "reset-claim-state") {
    const nonprofit = await prisma.nonprofit.findUnique({
      where: { ein: "13-3433452" },
      select: { id: true },
    });

    if (nonprofit) {
      await prisma.nonprofitAdmin.deleteMany({ where: { nonprofitId: nonprofit.id } });
      await prisma.nonprofitApplication.deleteMany({
        where: { nonprofitId: nonprofit.id },
      });
      // Clear description so onboarding triggers again
      await prisma.nonprofit.update({
        where: { id: nonprofit.id },
        data: { description: "" },
      });
    }

    // Reset current user to DONOR
    if (userId) {
      await prisma.user.update({ where: { id: userId }, data: { role: "DONOR" } });
    }

    return NextResponse.json({
      ok: true,
      message: "Claim state fully reset. You are now a DONOR. Doctors Without Borders is unclaimed and ready to test the full flow: claim → admin approval → onboarding.",
      redirect: "/auth/claim",
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
