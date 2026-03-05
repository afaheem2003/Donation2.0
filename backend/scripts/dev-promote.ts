/**
 * Dev script: promote a user to nonprofit OWNER + seed test data.
 *
 * Usage:
 *   cd backend
 *   npx tsx scripts/dev-promote.ts afaheem2003@gmail.com
 *
 * Optional flags:
 *   --platform-admin   Also set role to PLATFORM_ADMIN (can review applications)
 *   --reset            Reset role back to DONOR
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith("--"));
  const isPlatformAdmin = args.includes("--platform-admin");
  const isReset = args.includes("--reset");

  if (!email) {
    console.error("Usage: npx tsx scripts/dev-promote.ts <email> [--platform-admin] [--reset]");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`\n✗ No user found with email: ${email}`);
    console.error("  Sign in via the web app first, then re-run this script.\n");
    process.exit(1);
  }

  console.log(`\n👤 Found user: ${user.name ?? "(no name)"} (${user.email})`);
  console.log(`   Current role: ${user.role}`);

  // ── Reset ─────────────────────────────────────────────────────────────────
  if (isReset) {
    await prisma.user.update({ where: { id: user.id }, data: { role: "DONOR" } });
    console.log("\n✓ Role reset to DONOR");
    return;
  }

  // ── Platform admin ────────────────────────────────────────────────────────
  if (isPlatformAdmin) {
    await prisma.user.update({ where: { id: user.id }, data: { role: "PLATFORM_ADMIN" } });
    console.log("\n✓ Role set to PLATFORM_ADMIN");
    console.log("  → Visit: http://localhost:3001/admin/applications");
    return;
  }

  // ── Nonprofit admin ───────────────────────────────────────────────────────
  // 1. Upsert test nonprofit
  const nonprofit = await prisma.nonprofit.upsert({
    where: { ein: "99-9999999" },
    update: {},
    create: {
      name: "Test Nonprofit (Dev)",
      ein: "99-9999999",
      description: "A test nonprofit for local development.",
      category: "COMMUNITY",
      website: "https://example.com",
      logoUrl: "https://picsum.photos/seed/devnp/200/200",
      verified: true,
    },
  });
  console.log(`\n✓ Nonprofit: "${nonprofit.name}" (${nonprofit.id})`);

  // 2. Upsert admin record
  await prisma.nonprofitAdmin.upsert({
    where: { userId_nonprofitId: { userId: user.id, nonprofitId: nonprofit.id } },
    update: { role: "OWNER" },
    create: { userId: user.id, nonprofitId: nonprofit.id, role: "OWNER" },
  });
  console.log("✓ You are now OWNER of this nonprofit");

  console.log("✓ User is now OWNER of this nonprofit (role remains DONOR — portal access is derived from NonprofitAdmin records)");

  // 4. Seed donations if none exist
  const existingDonations = await prisma.donation.count({ where: { nonprofitId: nonprofit.id } });
  if (existingDonations === 0) {
    const amounts   = [500, 1000, 1500, 2000, 2500, 3000, 5000, 7500, 10000, 15000, 2500, 1000];
    const daysAgo   = [0, 1, 3, 5, 8, 12, 18, 22, 28, 35, 40, 50];
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
    console.log(`✓ Seeded ${amounts.length} test donations`);
  } else {
    console.log(`  (${existingDonations} donations already exist, skipping seed)`);
  }

  // 5. Seed a campaign if none exists
  const existingCampaigns = await prisma.campaign.count({ where: { nonprofitId: nonprofit.id } });
  if (existingCampaigns === 0) {
    await prisma.campaign.create({
      data: {
        nonprofitId: nonprofit.id,
        createdByUserId: user.id,
        title: "Spring Fundraiser 2025",
        slug: "spring-fundraiser-2025-dev",
        description: "A sample fundraising campaign for development testing.",
        goalCents: 500000,
        raisedCents: 57000,
        donorCount: 12,
        status: "ACTIVE",
        publishedAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    console.log("✓ Seeded 1 active campaign");
  }

  console.log("\n🎉 Done! Sign out and back in, then visit:");
  console.log("   → http://localhost:3001/portal/dashboard\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
