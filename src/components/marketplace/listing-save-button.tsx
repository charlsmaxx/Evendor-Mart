"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { currentPathForRedirect, signupUrl } from "@/lib/auth-redirect";

export function ListingSaveButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSave(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (busy || saved) return;
    setBusy(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      if (res.status === 401) {
        router.push(signupUrl(currentPathForRedirect()));
        return;
      }
      if (res.ok) setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onSave}
      aria-label={saved ? "Added to favourites" : "Add to favourites"}
      disabled={busy}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#1f1b18] shadow-md ring-1 ring-black/5 transition hover:bg-white"
    >
      <Heart
        className={cn("h-4 w-4", saved && "fill-[#7A2E3D] text-[#7A2E3D]")}
        strokeWidth={1.9}
      />
    </button>
  );
}
