import { PrismaClient } from "@prisma/client";
import { marketplaceCategorySeedRows } from "../src/lib/categories";

const prisma = new PrismaClient();

const categories = marketplaceCategorySeedRows();

async function main() {
  console.log("Seeding Evendor...");

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, sortOrder: cat.sortOrder },
      create: cat,
    });
  }

  const adminId = "00000000-0000-0000-0000-000000000001";
  await prisma.user.upsert({
    where: { id: adminId },
    update: {},
    create: {
      id: adminId,
      email: "admin@evendor.app",
      fullName: "Evendor Admin",
      role: "ADMIN",
      onboardingComplete: true,
      city: "Lagos",
    },
  });

  console.log("Seed complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
