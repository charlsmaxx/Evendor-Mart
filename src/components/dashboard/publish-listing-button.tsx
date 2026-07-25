"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PublishListingButton({ listingId }: { listingId: string }) {
  const router = useRouter();

  async function publish() {
    await fetch(`/api/listings/${listingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PUBLISHED" }),
    });
    router.refresh();
  }

  return (
    <Button size="sm" variant="gradient" onClick={publish}>
      Publish to marketplace
    </Button>
  );
}
