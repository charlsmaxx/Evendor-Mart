"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Trash2,
  Upload,
  Link2,
  ChevronUp,
  ChevronDown,
  Star,
  Video,
} from "lucide-react";
import { uploadFileToCloudinary } from "@/lib/upload-client";
import { reportClientError } from "@/lib/client-error";

interface PortfolioItem {
  id: string;
  url: string;
  publicId: string;
  sortOrder: number;
  listing?: { id: string; title: string; slug: string } | null;
}

interface ListingOption {
  id: string;
  title: string;
}

function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm)(\?|$)/i.test(url) || url.includes("/video/upload/");
}

export function PortfolioManager({ listings }: { listings: ListingOption[] }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [listingId, setListingId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [coverId, setCoverId] = useState<string | null>(null);

  const { data: portfolioData, isLoading } = useQuery({
    queryKey: ["vendor-portfolio"],
    queryFn: async () => {
      const res = await fetch("/api/vendor/portfolio");
      const json = await res.json();
      const payload = json.data as { items?: PortfolioItem[]; coverMediaId?: string | null } | PortfolioItem[];
      if (Array.isArray(payload)) {
        return {
          items: payload.sort((a, b) => a.sortOrder - b.sortOrder),
          coverMediaId: null as string | null,
        };
      }
      return {
        items: (payload.items ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
        coverMediaId: payload.coverMediaId ?? null,
      };
    },
  });

  const items = portfolioData?.items ?? [];

  useEffect(() => {
    if (portfolioData?.coverMediaId) setCoverId(portfolioData.coverMediaId);
  }, [portfolioData?.coverMediaId]);

  const { data: cloudinaryStatus } = useQuery({
    queryKey: ["cloudinary-status"],
    queryFn: async () => {
      const res = await fetch("/api/upload/sign");
      const json = await res.json();
      return { configured: json.data?.configured === true };
    },
  });

  const cloudinaryReady = cloudinaryStatus?.configured === true;

  const addMutation = useMutation({
    mutationFn: (body: { url: string; publicId: string; listingId?: string }) =>
      fetch("/api/vendor/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Failed to save");
        return json.data;
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor-portfolio"] });
      setUrl("");
    },
    onError: (e: Error) => reportClientError("portfolio", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/vendor/portfolio?id=${id}`, { method: "DELETE" }).then(async (res) => {
        if (!res.ok) throw new Error("Failed to delete");
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendor-portfolio"] }),
  });

  const reorderMutation = useMutation({
    mutationFn: (next: PortfolioItem[]) =>
      fetch("/api/vendor/portfolio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: next.map((item, index) => ({ id: item.id, sortOrder: index })),
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendor-portfolio"] }),
  });

  const coverMutation = useMutation({
    mutationFn: (mediaId: string) =>
      fetch("/api/vendor/portfolio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId }),
      }),
    onSuccess: (_, mediaId) => {
      setCoverId(mediaId);
      qc.invalidateQueries({ queryKey: ["vendor-portfolio"] });
    },
  });

  async function saveMedia(imageUrl: string, publicId: string) {
    await addMutation.mutateAsync({
      url: imageUrl,
      publicId,
      listingId: listingId || undefined,
    });
  }

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const result = await uploadFileToCloudinary(file, "portfolio");
      await saveMedia(result.url, result.publicId);
    } catch (e) {
      reportClientError("portfolio", e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      if (videoRef.current) videoRef.current.value = "";
    }
  }

  async function addFromUrl() {
    if (!url.trim()) return;
    setUploading(true);
    try {
      await saveMedia(url.trim(), `url_${Date.now()}`);
    } catch (e) {
      reportClientError("portfolio", e instanceof Error ? e.message : "Failed to save URL");
    } finally {
      setUploading(false);
    }
  }

  function moveItem(index: number, dir: -1 | 1) {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorderMutation.mutate(next);
  }

  return (
    <div className="space-y-8">
      <div className="glass max-w-lg space-y-4 rounded-2xl p-6">
        <div>
          <Label htmlFor="portfolio-listing">Link to listing (optional)</Label>
          <select
            id="portfolio-listing"
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
          >
            <option value="">General portfolio</option>
            {listings.map((l) => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label>Upload image</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadFile(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="mt-2 w-full gap-2"
              disabled={uploading || !cloudinaryReady}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4" /> Photo
            </Button>
          </div>
          <div>
            <Label>Upload video</Label>
            <input
              ref={videoRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadFile(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="mt-2 w-full gap-2"
              disabled={uploading || !cloudinaryReady}
              onClick={() => videoRef.current?.click()}
            >
              <Video className="h-4 w-4" /> Video
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or paste URL</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            disabled={uploading}
          />
          <Button variant="outline" onClick={addFromUrl} disabled={uploading || !url.trim()}>
            <Link2 className="h-4 w-4" />
          </Button>
        </div>

      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading portfolio…</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">No portfolio media yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => {
            const isVideo = isVideoUrl(item.url);
            const isCover = coverId === item.id;
            return (
              <div key={item.id} className="glass group overflow-hidden rounded-xl">
                <div className="relative aspect-[4/3] bg-muted">
                  {isVideo ? (
                    <video src={item.url} className="h-full w-full object-cover" controls />
                  ) : (
                    <Image src={item.url} alt="Portfolio" fill className="object-cover" sizes="33vw" />
                  )}
                  {isCover && (
                    <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      Cover
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-1 p-3">
                  <p className="truncate text-xs text-muted-foreground">
                    {item.listing?.title ?? "General"}
                  </p>
                  <div className="flex shrink-0 gap-0.5">
                    <Button size="sm" variant="ghost" disabled={index === 0} onClick={() => moveItem(index, -1)}>
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={index === items.length - 1}
                      onClick={() => moveItem(index, 1)}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    {!isVideo && (
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Set as marketplace cover"
                        onClick={() => coverMutation.mutate(item.id)}
                      >
                        <Star className={`h-4 w-4 ${isCover ? "fill-amber-400 text-amber-500" : ""}`} />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
