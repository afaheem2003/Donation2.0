import { PrismaClient, NonprofitCategory } from "@prisma/client";

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
  },
];

async function main() {
  console.log("🌱 Seeding database...");

  // Upsert nonprofits
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
      },
      create: np,
    });
    console.log(`  ✓ ${np.name}`);
  }

  console.log(`\n✅ Seeded ${nonprofits.length} nonprofits`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
