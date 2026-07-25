"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareListingButton({
  title,
  url,
  variant = "outline" as const,
}: {
  title: string;
  url?: string;
  variant?: "outline" | "ghost";
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, url: shareUrl, text: `Check out ${title} on Evendor` });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user cancelled share sheet */
    }
  }

  return (
    <Button type="button" variant={variant} onClick={share} className="gap-1.5">
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
      {copied ? "Link copied" : "Share"}
    </Button>
  );
}
