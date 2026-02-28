import { PrismaClient, NonprofitCategory, DonationStatus } from "@prisma/client";

const prisma = new PrismaClient();

const nonprofits = [
  {
    name: "Doctors Without Borders USA",
    ein: "13-3433452",
    description:
      "Médecins Sans Frontières (MSF) delivers emergency medical care to people affected by armed conflict, disease outbreaks, and natural disasters worldwide.",
    category: NonprofitCategory.HEALTH,
    website: "https://www.doctorswithoutborders.org",
    logoUrl: "https://picsum.photos/seed/msf/200/200",
    verified: true,
    latitude: 40.7484,
    longitude: -73.9967,
  },
  {
    name: "Khan Academy",
    ein: "26-1544963",
    description:
      "A nonprofit with the mission to provide a free, world-class education for anyone, anywhere. Over 150 million learners use Khan Academy worldwide.",
    category: NonprofitCategory.EDUCATION,
    website: "https://www.khanacademy.org",
    logoUrl: "https://picsum.photos/seed/khan/200/200",
    verified: true,
    latitude: 37.3628,
    longitude: -122.0341,
  },
  {
    name: "The Nature Conservancy",
    ein: "53-0242652",
    description:
      "A global environmental nonprofit working to create a world where people and nature can thrive. We protect the lands and waters on which all life depends.",
    category: NonprofitCategory.ENVIRONMENT,
    website: "https://www.nature.org",
    logoUrl: "https://picsum.photos/seed/nature/200/200",
    verified: true,
    latitude: 38.8864,
    longitude: -77.1044,
  },
  {
    name: "Feeding America",
    ein: "36-3673599",
    description:
      "The nation's largest domestic hunger-relief organization, with a network of 200 food banks and 60,000 food pantries and meal programs.",
    category: NonprofitCategory.HUMAN_SERVICES,
    website: "https://www.feedingamerica.org",
    logoUrl: "https://picsum.photos/seed/feeding/200/200",
    verified: true,
    latitude: 41.8827,
    longitude: -87.6233,
  },
  {
    name: "ASPCA",
    ein: "13-1623829",
    description:
      "The American Society for the Prevention of Cruelty to Animals works to rescue animals from abuse, pass humane laws, and share resources with shelters nationwide.",
    category: NonprofitCategory.ANIMALS,
    website: "https://www.aspca.org",
    logoUrl: "https://picsum.photos/seed/aspca/200/200",
    verified: true,
    latitude: 40.7614,
    longitude: -73.9776,
  },
  {
    name: "UNICEF USA",
    ein: "13-1760110",
    description:
      "UNICEF works in over 190 countries and territories to save children's lives, defend their rights, and help them fulfill their potential.",
    category: NonprofitCategory.INTERNATIONAL,
    website: "https://www.unicefusa.org",
    logoUrl: "https://picsum.photos/seed/unicef/200/200",
    verified: true,
    latitude: 40.7489,
    longitude: -73.9682,
  },
  {
    name: "Habitat for Humanity International",
    ein: "91-1914868",
    description:
      "A global nonprofit housing organization working in local communities across all 50 states and in over 70 countries to help people achieve strength, stability, and self-reliance through shelter.",
    category: NonprofitCategory.COMMUNITY,
    website: "https://www.habitat.org",
    logoUrl: "https://picsum.photos/seed/habitat/200/200",
    verified: true,
    latitude: 32.0710,
    longitude: -84.2303,
  },
  {
    name: "American Red Cross",
    ein: "53-0196605",
    description:
      "Preventing and alleviating human suffering in the face of emergencies by mobilizing the power of volunteers and the generosity of donors.",
    category: NonprofitCategory.HUMAN_SERVICES,
    website: "https://www.redcross.org",
    logoUrl: "https://picsum.photos/seed/redcross/200/200",
    verified: true,
    latitude: 38.9127,
    longitude: -77.0442,
  },
  {
    name: "St. Jude Children's Research Hospital",
    ein: "35-1044585",
    description:
      "Leading the way the world understands, treats and defeats childhood cancer and other life-threatening diseases. Families never receive a bill for treatment, travel, housing or food.",
    category: NonprofitCategory.HEALTH,
    website: "https://www.stjude.org",
    logoUrl: "https://picsum.photos/seed/stjude/200/200",
    verified: true,
    latitude: 35.1530,
    longitude: -90.0445,
  },
  {
    name: "Local Arts Fund",
    ein: "47-1234567",
    description:
      "Supporting emerging artists and arts education in underserved communities. We fund grants, residencies, and public art installations across the country.",
    category: NonprofitCategory.ARTS,
    website: "https://www.localartsfund.org",
    logoUrl: "https://picsum.photos/seed/arts/200/200",
    verified: false,
    latitude: 37.7749,
    longitude: -122.4194,
  },
];

// Seed users
const seedUsers = [
  {
    email: "sarah.chen@seed.dev",
    name: "Sarah Chen",
    username: "sarahchen",
    avatarUrl: "https://i.pravatar.cc/200?u=sarahchen",
  },
  {
    email: "marcus.johnson@seed.dev",
    name: "Marcus Johnson",
    username: "marcusj",
    avatarUrl: "https://i.pravatar.cc/200?u=marcusj",
  },
  {
    email: "emma.wilson@seed.dev",
    name: "Emma Wilson",
    username: "emmawilson",
    avatarUrl: "https://i.pravatar.cc/200?u=emmawilson",
  },
  {
    email: "alex.rivera@seed.dev",
    name: "Alex Rivera",
    username: "alexrivera",
    avatarUrl: "https://i.pravatar.cc/200?u=alexrivera",
  },
  {
    email: "jordan.lee@seed.dev",
    name: "Jordan Lee",
    username: "jordanlee",
    avatarUrl: "https://i.pravatar.cc/200?u=jordanlee",
  },
];

async function main() {
  console.log("🌱 Seeding database...");

  // ── Nonprofits ───────────────────────────────────────────────────────────────
  for (const np of nonprofits) {
    await prisma.nonprofit.upsert({
      where: { ein: np.ein },
      update: {
        name: np.name,
        description: np.description,
        category: np.category,
        website: np.website,
        logoUrl: np.logoUrl,
        verified: np.verified,
        latitude: np.latitude,
        longitude: np.longitude,
      },
      create: np,
    });
    console.log(`  ✓ ${np.name}`);
  }

  // ── Users ────────────────────────────────────────────────────────────────────
  console.log("\n👤 Seeding users...");
  const users: Record<string, { id: string }> = {};
  for (const u of seedUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, avatarUrl: u.avatarUrl },
      create: u,
    });
    users[u.username] = user;
    console.log(`  ✓ @${u.username}`);
  }

  // Skip post seeding if posts already exist for seed users
  const existingPostCount = await prisma.post.count({
    where: { userId: { in: Object.values(users).map((u) => u.id) } },
  });
  if (existingPostCount > 0) {
    console.log(`\n⏭  Posts already seeded (${existingPostCount} found), skipping.`);
    return;
  }

  // ── Fetch nonprofits for linking ─────────────────────────────────────────────
  const nps = await prisma.nonprofit.findMany({ select: { id: true, name: true, ein: true } });
  const npByEin = Object.fromEntries(nps.map((n) => [n.ein, n]));

  const msf      = npByEin["13-3433452"]; // Doctors Without Borders
  const khan     = npByEin["26-1544963"]; // Khan Academy
  const nature   = npByEin["53-0242652"]; // The Nature Conservancy
  const feeding  = npByEin["36-3673599"]; // Feeding America
  const aspca    = npByEin["13-1623829"]; // ASPCA
  const unicef   = npByEin["13-1760110"]; // UNICEF
  const habitat  = npByEin["91-1914868"]; // Habitat for Humanity
  const redcross = npByEin["53-0196605"]; // Red Cross

  console.log("\n📝 Seeding posts...");

  // Helper to create a donation + post
  async function seedPost({
    username, nonprofit, amountCents, caption, imageUrl,
    daysAgo = 0,
  }: {
    username: string;
    nonprofit: { id: string; name: string };
    amountCents?: number;
    caption: string;
    imageUrl?: string;
    daysAgo?: number;
  }) {
    const userId = users[username].id;
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    let donationId: string | undefined;
    if (amountCents) {
      const donation = await prisma.donation.create({
        data: {
          userId,
          nonprofitId: nonprofit.id,
          amountCents,
          status: DonationStatus.SUCCEEDED,
          donatedAt: createdAt,
          createdAt,
        },
      });
      donationId = donation.id;
    }

    return prisma.post.create({
      data: {
        userId,
        nonprofitId: nonprofit.id,
        donationId,
        caption,
        imageUrl,
        createdAt,
      },
    });
  }

  // ── Post data ─────────────────────────────────────────────────────────────────
  const postDefs = [
    {
      username: "sarahchen",
      nonprofit: msf,
      amountCents: 5000,
      caption: "Just gave to Doctors Without Borders. The work they do in conflict zones is unreal — real heroes out there.",
      imageUrl: "https://picsum.photos/seed/post1/800/600",
      daysAgo: 1,
    },
    {
      username: "marcusj",
      nonprofit: nature,
      amountCents: 2500,
      caption: "Protecting 125 million acres worldwide. This is the kind of org that makes you feel hopeful about the planet 🌍",
      imageUrl: "https://picsum.photos/seed/post2/800/600",
      daysAgo: 2,
    },
    {
      username: "emmawilson",
      nonprofit: khan,
      amountCents: 10000,
      caption: "Free world-class education for anyone, anywhere. Khan Academy changed my life and I'm paying it forward.",
      imageUrl: undefined,
      daysAgo: 2,
    },
    {
      username: "alexrivera",
      nonprofit: feeding,
      amountCents: 7500,
      caption: "1 in 8 Americans face hunger. Feeding America's food bank network is incredible. Proud to contribute.",
      imageUrl: "https://picsum.photos/seed/post4/800/600",
      daysAgo: 3,
    },
    {
      username: "jordanlee",
      nonprofit: aspca,
      amountCents: 3000,
      caption: "Adopted my dog Max from a shelter 2 years ago — donating to ASPCA every month now. These animals deserve better.",
      imageUrl: "https://picsum.photos/seed/post5/800/800",
      daysAgo: 4,
    },
    {
      username: "sarahchen",
      nonprofit: unicef,
      amountCents: 15000,
      caption: "190 countries. 2 billion children. UNICEF does it all. This one felt important.",
      imageUrl: "https://picsum.photos/seed/post6/800/600",
      daysAgo: 5,
    },
    {
      username: "marcusj",
      nonprofit: habitat,
      amountCents: 5000,
      caption: "Went to a Habitat for Humanity build last weekend — transformative experience. Made a donation too.",
      imageUrl: "https://picsum.photos/seed/post7/800/600",
      daysAgo: 6,
    },
    {
      username: "emmawilson",
      nonprofit: redcross,
      amountCents: 2000,
      caption: "Wildfire season hit hard this year. American Red Cross is on the ground. Every bit counts.",
      imageUrl: undefined,
      daysAgo: 7,
    },
    {
      username: "alexrivera",
      nonprofit: msf,
      amountCents: undefined,
      caption: "Been following MSF's work in Sudan — devastating what's happening there. Please look them up if you haven't.",
      imageUrl: "https://picsum.photos/seed/post9/800/500",
      daysAgo: 8,
    },
    {
      username: "jordanlee",
      nonprofit: nature,
      amountCents: 5000,
      caption: "Matched my company donation this month to The Nature Conservancy. If your employer does matching — use it!",
      imageUrl: "https://picsum.photos/seed/post10/800/600",
      daysAgo: 9,
    },
  ];

  const createdPosts: { id: string }[] = [];
  for (const def of postDefs) {
    const post = await seedPost(def);
    createdPosts.push(post);
    console.log(`  ✓ @${def.username} → ${def.nonprofit.name}`);
  }

  // ── Likes ─────────────────────────────────────────────────────────────────────
  console.log("\n❤️  Seeding likes...");
  const allUserIds = Object.values(users).map((u) => u.id);

  for (const post of createdPosts) {
    // Randomly like each post from 0-4 users
    const likers = allUserIds.filter(() => Math.random() > 0.4);
    for (const userId of likers) {
      await prisma.like.upsert({
        where: { postId_userId: { postId: post.id, userId } },
        update: {},
        create: { postId: post.id, userId },
      });
    }
  }
  console.log("  ✓ Likes added");

  // ── Comments ─────────────────────────────────────────────────────────────────
  console.log("\n💬 Seeding comments...");
  const comments = [
    "This is so inspiring, thank you for sharing!",
    "I donate to them too — great choice.",
    "Love seeing this on my feed 🙌",
    "Just donated because of this post!",
    "This org is incredible, been following them for years.",
    "You're making a real difference ❤️",
    "Added them to my monthly giving list!",
    "Thank you for spreading awareness about this.",
  ];

  // Add 1-3 comments to about half the posts
  for (const post of createdPosts) {
    if (Math.random() > 0.5) continue;
    const commenters = allUserIds.filter(() => Math.random() > 0.6).slice(0, 3);
    for (const userId of commenters) {
      const body = comments[Math.floor(Math.random() * comments.length)];
      await prisma.comment.create({ data: { postId: post.id, userId, body } });
    }
  }
  console.log("  ✓ Comments added");

  console.log(`\n✅ Done — seeded ${postDefs.length} posts across ${seedUsers.length} users`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
