"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { startVendorConversation } from "@/lib/start-conversation";
import { reportClientError } from "@/lib/client-error";

export function VendorMessageButton({
  vendorId,
  listingId,
  vendorSlug,
  label = "Chat vendor",
  variant = "gradient" as const,
}: {
  vendorId: string;
  listingId?: string;
  vendorSlug: string;
  label?: string;
  variant?: "gradient" | "outline";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function startChat() {
    setLoading(true);
    const result = await startVendorConversation({ vendorId, listingId, vendorSlug, router });
    setLoading(false);
    if (!result.ok && result.error) reportClientError("messages", result.error);
  }

  return (
    <Button variant={variant} onClick={startChat} disabled={loading}>
      <MessageSquare className="h-4 w-4" />
      {loading ? "Opening..." : label}
    </Button>
  );
}
