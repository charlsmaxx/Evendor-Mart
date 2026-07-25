/**
 * Positive/negative check for the Paystack webhook signature gate.
 * Uses a reference that matches no payment, so nothing in the database changes.
 */
import crypto from "crypto";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const secret = env.match(/^PAYSTACK_SECRET_KEY=(.+)$/m)?.[1]?.trim();
if (!secret) throw new Error("PAYSTACK_SECRET_KEY not found in .env.local");

const url = "http://localhost:3000/api/webhooks/paystack";
const body = JSON.stringify({
  event: "charge.success",
  data: {
    reference: `smoke_${crypto.randomBytes(6).toString("hex")}`,
    status: "success",
    amount: 100,
    currency: "NGN",
  },
});
const signature = crypto.createHmac("sha512", secret).update(body).digest("hex");

async function post(label, sig) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-paystack-signature": sig },
    body,
  });
  console.log(`${label.padEnd(28)} -> ${res.status} ${await res.text()}`);
}

await post("valid signature", signature);
await post("tampered signature", signature.replace(/.$/, (c) => (c === "a" ? "b" : "a")));
await post("non-hex signature", "not-a-signature");
