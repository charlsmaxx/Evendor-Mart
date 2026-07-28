"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ShareListingButton({
  title,
  url,
  variant = "outline" as const,
  className,
}: {
  title: string;
  url?: string;
  variant?: "outline" | "ghost";
  className?: string;
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
    <Button type="button" variant={variant} onClick={share} className={cn("gap-1.5", className)}>
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
      {copied ? "Link copied" : "Share"}
    </Button>
  );
}
