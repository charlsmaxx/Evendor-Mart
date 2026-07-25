/**
 * Apply a .sql migration file statement by statement.
 *
 * `prisma db execute` sends the whole file down one connection, which collides with
 * pgbouncer's prepared-statement handling on Supabase's transaction pooler (port 6543)
 * and fails with `prepared statement "s1" already exists`. Running each statement on its
 * own through the client avoids that.
 *
 * Usage: node scripts/run-sql.mjs prisma/add-rewards-discount.sql
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-sql.mjs <path-to-sql>");
  process.exit(1);
}

/** Split on semicolons that end a statement, ignoring those inside quotes or comments. */
function splitStatements(sql) {
  const statements = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      if (char === "\n") inLineComment = false;
      current += char;
      continue;
    }
    if (!inSingle && !inDouble && char === "-" && next === "-") {
      inLineComment = true;
      current += char;
      continue;
    }
    if (!inDouble && char === "'") inSingle = !inSingle;
    else if (!inSingle && char === '"') inDouble = !inDouble;

    if (char === ";" && !inSingle && !inDouble) {
      statements.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  if (current.trim()) statements.push(current.trim());

  return statements.filter((s) => s.replace(/--.*$/gm, "").trim().length > 0);
}

const prisma = new PrismaClient();
const statements = splitStatements(readFileSync(file, "utf8"));

console.log(`Applying ${statements.length} statement(s) from ${file}`);

let failed = false;
try {
  for (const [index, statement] of statements.entries()) {
    const preview = statement.replace(/\s+/g, " ").slice(0, 90);
    try {
      const affected = await prisma.$executeRawUnsafe(statement);
      console.log(`  [${index + 1}/${statements.length}] ok (${affected}) ${preview}`);
    } catch (error) {
      failed = true;
      console.error(`  [${index + 1}/${statements.length}] FAILED ${preview}`);
      console.error(`    ${error.message.split("\n")[0]}`);
      break;
    }
  }
} finally {
  await prisma.$disconnect();
}

if (failed) process.exit(1);
console.log("Done.");
