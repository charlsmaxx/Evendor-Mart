import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError } from "@/lib/api-response";
import { initializeTransaction } from "@/lib/paystack";
import crypto from "crypto";

const PREMIUM_AMOUNT = 500000; // ₦5,000 in kobo

export async function POST() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== "VENDOR" && user.role !== "ADMIN") {
    return jsonError("Vendors only", 403);
  }

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
  if (!vendor) return jsonError("Vendor profile required", 400);

  const reference = `sub_${crypto.randomBytes(10).toString("hex")}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const subscription = await prisma.subscription.create({
    data: {
      vendorId: vendor.id,
      tier: "PREMIUM",
      status: "PENDING",
      amount: 5000,
    },
  });

  try {
    const tx = await initializeTransaction({
      email: user.email,
      amount: PREMIUM_AMOUNT,
      reference,
      callback_url: `${appUrl}/vendor/subscription?success=1`,
      metadata: { subscriptionId: subscription.id, vendorId: vendor.id },
    });

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { paystackSubCode: reference },
    });

    return jsonOk({ authorization_url: tx.authorization_url, reference });
  } catch (e) {
    // Clean up the pending subscription so the user can retry
    await prisma.subscription.delete({ where: { id: subscription.id } }).catch(() => {});

    const raw = e instanceof Error ? e.message : String(e);
    const isKeyError =
      raw.toLowerCase().includes("invalid key") ||
      raw.toLowerCase().includes("authorization") ||
      raw.toLowerCase().includes("secret");

    const message = isKeyError
      ? "Payment checkout is not configured yet. Add your PAYSTACK_SECRET_KEY to .env.local to enable subscriptions."
      : `Checkout failed — ${raw}`;

    console.error("[Evendor:subscriptions] Paystack error:", raw);
    return jsonError(message, 502);
  }
}

export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId: user.id },
    include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!vendor) return jsonOk(null);

  return jsonOk({
    tier: vendor.subscriptionTier,
    subscription: vendor.subscriptions[0] ?? null,
  });
}
