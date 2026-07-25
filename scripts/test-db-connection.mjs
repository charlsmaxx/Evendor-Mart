import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (supabaseUrl && anonKey) {
  const res = await fetch(`${supabaseUrl}/rest/v1/`, { headers: { apikey: anonKey } });
  console.log(`Supabase REST API: ${res.status} ${res.statusText}`);
}

const ref = supabaseUrl?.match(/https:\/\/([^.]+)/)?.[1];
const passMatch = process.env.DATABASE_URL?.match(/postgres\.[^:]+:([^@]+)@/);
const pass = passMatch?.[1];

if (!ref || !pass) {
  console.error("Could not parse project ref or password from env");
  process.exit(1);
}

const candidates = [
  ["current DATABASE_URL", process.env.DATABASE_URL],
  [
    "transaction pooler + sslmode",
    `postgresql://postgres.${ref}:${pass}@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require`,
  ],
  [
    "session pooler",
    `postgresql://postgres.${ref}:${pass}@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require`,
  ],
  [
    "direct connection",
    `postgresql://postgres.${ref}:${pass}@db.${ref}.supabase.co:5432/postgres?sslmode=require`,
  ],
];

for (const [label, url] of candidates) {
  if (!url) continue;
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const count = await prisma.user.count();
    console.log(`${label}: OK (users=${count})`);
    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    const err = e && typeof e === "object" ? e : {};
    const code = "code" in err ? err.code : "unknown";
    const message = "message" in err ? String(err.message).replace(/\n/g, " | ") : String(e);
    console.log(`${label}: FAIL — code=${code} ${message}`);
    await prisma.$disconnect();
  }
}

process.exit(1);
