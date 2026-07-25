"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/client-error";

export function PayDepositButton({ bookingId }: { bookingId: string }) {
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const json = await res.json();
      if (json.data?.authorization_url) {
        window.location.href = json.data.authorization_url;
        return;
      }
      reportClientError("payment", json.error?.message ?? "Could not start payment");
    } catch (err) {
      reportClientError("payment", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="gradient" onClick={handlePay} disabled={loading}>
      {loading ? "Redirecting to Paystack…" : "Pay deposit"}
    </Button>
  );
}
