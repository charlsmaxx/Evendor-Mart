import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];
const pass = process.env.DATABASE_URL?.match(/postgres\.[^:]+:([^@]+)@/)?.[1];
if (!ref || !pass) {
  console.error("Missing ref or password");
  process.exit(1);
}

const urls = [
  ["transaction:6543", process.env.DATABASE_URL],
  [
    "session:5432",
    `postgresql://postgres.${ref}:${pass}@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require&connect_timeout=30`,
  ],
];

for (const [label, url] of urls) {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const start = Date.now();
  try {
    const count = await prisma.user.count();
    console.log(`${label}: OK users=${count} (${Date.now() - start}ms)`);
  } catch (e) {
    const code = e?.code ?? "unknown";
    console.log(`${label}: FAIL code=${code} (${Date.now() - start}ms)`);
  }
  await prisma.$disconnect();
}
