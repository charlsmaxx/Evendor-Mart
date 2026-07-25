import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$queryRaw`SELECT 1 as ok`;
  const [users, listings] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count(),
  ]);
  console.log(`Connected. Users: ${users}, Listings: ${listings}`);
}

main()
  .catch((e) => {
    console.error("Connection failed:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
