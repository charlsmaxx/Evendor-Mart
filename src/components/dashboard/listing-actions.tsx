"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ListingActions({
  listingId,
  status,
}: {
  listingId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"archive" | "delete" | null>(null);

  async function archive() {
    if (!confirm("Archive this listing? It will be hidden from the marketplace.")) return;
    setLoading("archive");
    await fetch(`/api/listings/${listingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ARCHIVED" }),
    });
    setLoading(null);
    router.refresh();
  }

  async function remove() {
    if (
      !confirm(
        "Delete this listing? Drafts with no bookings are removed permanently; otherwise it will be archived."
      )
    ) {
      return;
    }
    setLoading("delete");
    await fetch(`/api/listings/${listingId}`, { method: "DELETE" });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "ARCHIVED" && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          disabled={loading !== null}
          onClick={archive}
        >
          <Archive className="h-3.5 w-3.5" />
          {loading === "archive" ? "Archiving…" : "Archive"}
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="gap-1 text-destructive hover:text-destructive"
        disabled={loading !== null}
        onClick={remove}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {loading === "delete" ? "Removing…" : "Delete"}
      </Button>
    </div>
  );
}
