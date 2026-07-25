"use client";

import { Button } from "@/components/ui/button";

export function OfflineRetryButton() {
  return (
    <Button
      type="button"
      variant="gradient"
      className="bg-[#A12A4A] hover:bg-[#7A2E3D]"
      onClick={() => window.location.reload()}
    >
      Retry
    </Button>
  );
}
