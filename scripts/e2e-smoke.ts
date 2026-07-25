/**
 * E2E smoke test for booking + Paystack webhook flow.
 * Requires: valid DATABASE_URL, PAYSTACK_SECRET_KEY, dev server on :3000
 *
 * Usage:
 *   npm run dev          # terminal 1
 *   npm run test:e2e       # terminal 2 (after env is configured)
 */
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const REQUIRED = ["DATABASE_URL", "PAYSTACK_SECRET_KEY"] as const;

function fail(msg: string): never {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

function ok(msg: string) {
  console.log(`✓ ${msg}`);
}

async function checkEnv() {
  console.log("\n1. Environment");
  for (const key of REQUIRED) {
    const val = process.env[key];
    if (!val || val.includes("[PROJECT]") || val.includes("xxx")) {
      fail(`${key} is missing or still a placeholder — fill .env.local first`);
    }
    ok(`${key} configured`);
  }
}

async function checkDb() {
  console.log("\n2. Database");
  try {
    const count = await prisma.listing.count({ where: { status: "PUBLISHED" } });
    if (count === 0) fail("No published listings — run: npm run db:seed");
    ok(`${count} published listing(s)`);
  } catch (e) {
    fail(`DB connection failed: ${e instanceof Error ? e.message : e}`);
  }
}

async function simulateWebhook(reference: string) {
  const secret = process.env.PAYSTACK_SECRET_KEY!;
  const body = JSON.stringify({
    event: "charge.success",
    data: {
      reference,
      status: "success",
      metadata: {},
    },
  });
  const signature = crypto.createHmac("sha512", secret).update(body).digest("hex");

  const res = await fetch(`${BASE}/api/webhooks/paystack`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-paystack-signature": signature,
    },
    body,
  });
  const json = await res.json();
  if (!res.ok) fail(`Webhook returned ${res.status}: ${JSON.stringify(json)}`);
  ok(`Webhook processed: ${JSON.stringify(json)}`);
}

async function testBookingWebhook() {
  console.log("\n3. Booking + webhook simulation");

  const listing = await prisma.listing.findFirst({
    where: { status: "PUBLISHED" },
    include: { vendor: true },
  });
  if (!listing) fail("No listing found");

  const customerId = crypto.randomUUID();
  await prisma.user.upsert({
    where: { id: customerId },
    update: {},
    create: {
      id: customerId,
      email: `e2e-${Date.now()}@evendor.test`,
      fullName: "E2E Customer",
      role: "CUSTOMER",
      onboardingComplete: true,
    },
  });
  ok(`Test customer ${customerId.slice(0, 8)}…`);

  const depositPercent = Number(process.env.BOOKING_DEPOSIT_PERCENT ?? 30);
  const totalAmount = listing.priceMin;
  const depositAmount = Math.round(totalAmount * (depositPercent / 100));

  const booking = await prisma.booking.create({
    data: {
      customerId,
      vendorId: listing.vendorId,
      listingId: listing.id,
      eventDate: new Date(Date.now() + 30 * 86400000),
      totalAmount,
      depositAmount,
      depositPercent,
      status: "PENDING_PAYMENT",
    },
  });
  ok(`Booking created ${booking.id.slice(0, 8)}… (PENDING_PAYMENT)`);

  const reference = `ev_e2e_${crypto.randomBytes(8).toString("hex")}`;
  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount: depositAmount,
      status: "PENDING",
      paystackRef: reference,
      escrowStatus: "HELD",
      heldAmount: depositAmount,
    },
  });
  ok(`Payment pending, ref ${reference}`);

  await simulateWebhook(reference);

  const updated = await prisma.booking.findUnique({
    where: { id: booking.id },
    include: { payments: true },
  });
  if (updated?.status !== "CONFIRMED") {
    fail(`Expected CONFIRMED, got ${updated?.status}`);
  }
  if (updated.payments[0]?.status !== "SUCCESS") {
    fail(`Expected payment SUCCESS, got ${updated.payments[0]?.status}`);
  }
  ok("Booking CONFIRMED + payment SUCCESS");

  const audit = await prisma.auditLog.findFirst({
    where: { action: "PAYMENT_SUCCESS", entityId: updated.payments[0].id },
  });
  if (!audit) fail("Audit log missing");
  ok("Audit log written");

  console.log("\n✓ E2E smoke test passed\n");
}

async function main() {
  console.log("Evendor E2E smoke — auth → book → webhook");
  await checkEnv();
  await checkDb();
  await testBookingWebhook();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
