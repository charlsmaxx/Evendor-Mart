"use client";

import { useEffect, useState, useCallback } from "react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Star, ChevronLeft, ChevronRight, X, BadgeCheck, ThumbsUp } from "lucide-react";
import { isVideoMedia } from "@/lib/vendor-media";
import { Badge } from "@/components/ui/badge";

interface PortfolioProps {
  items: { id: string; url: string; resourceType?: string }[];
}

export function ListingPortfolio({ items }: PortfolioProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="font-display text-xl font-semibold">Portfolio</h2>
      <div className="mt-4 columns-1 gap-3 sm:columns-2 lg:columns-3">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-xl bg-black text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{ aspectRatio: index % 5 === 0 ? "3/4" : index % 3 === 0 ? "1/1" : "4/3" }}
          >
            {isVideoMedia(item) ? (
              <video
                src={item.url}
                className="h-full w-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              <OptimizedImage
                src={item.url}
                preset="portfolio"
                alt="Portfolio"
                fill
                className="object-cover transition duration-300 hover:scale-[1.02]"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
            )}
            {isVideoMedia(item) && (
              <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white">
                Video
              </span>
            )}
          </button>
        ))}
      </div>

      {openIndex != null && (
        <PortfolioLightbox
          items={items}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onChange={setOpenIndex}
        />
      )}
    </section>
  );
}

function PortfolioLightbox({
  items,
  index,
  onClose,
  onChange,
}: {
  items: { id: string; url: string; resourceType?: string }[];
  index: number;
  onClose: () => void;
  onChange: (index: number) => void;
}) {
  const item = items[index];
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) onChange(index - 1);
  }, [hasPrev, index, onChange]);

  const goNext = useCallback(() => {
    if (hasNext) onChange(index + 1);
  }, [hasNext, index, onChange]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [goNext, goPrev, onClose]);

  useEffect(() => {
    let startX = 0;
    let startY = 0;

    function onTouchStart(e: TouchEvent) {
      startX = e.touches[0]?.clientX ?? 0;
      startY = e.touches[0]?.clientY ?? 0;
    }

    function onTouchEnd(e: TouchEvent) {
      const endX = e.changedTouches[0]?.clientX ?? 0;
      const endY = e.changedTouches[0]?.clientY ?? 0;
      const dx = endX - startX;
      const dy = endY - startY;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) goNext();
      else goPrev();
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [goNext, goPrev]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label="Portfolio media viewer"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      {hasPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:left-6"
          aria-label="Previous"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {hasNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:right-6"
          aria-label="Next"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      <div
        className="relative mx-4 flex max-h-[85vh] w-full max-w-5xl items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideoMedia(item) ? (
          <video
            key={item.id}
            src={item.url}
            className="max-h-[85vh] w-auto max-w-full rounded-lg"
            controls
            autoPlay
            playsInline
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.id}
            src={item.url}
            alt={`Portfolio ${index + 1}`}
            className="max-h-[85vh] w-auto max-w-full rounded-lg object-contain"
          />
        )}
      </div>

      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80">
        {index + 1} / {items.length}
      </p>
    </div>
  );
}

interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  vendorReply: string | null;
  bookingId?: string | null;
  createdAt: Date;
  user: { fullName: string | null; avatarUrl: string | null };
}

export function ListingReviews({
  reviews,
  ratingAvg,
  reviewCount,
  className = "",
}: {
  reviews: ReviewItem[];
  ratingAvg?: number;
  reviewCount?: number;
  className?: string;
}) {
  const total = reviewCount ?? reviews.length;

  return (
    <section className={`rounded-2xl border border-border bg-card p-6 ${className}`.trim()}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold">Customer reviews</h2>
        {total > 0 && ratingAvg != null && (
          <span className="flex items-center gap-1 text-sm text-amber-500">
            <Star className="h-4 w-4 fill-amber-400" />
            {ratingAvg.toFixed(1)} · {total} review{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No reviews yet. Book this listing and be the first to share your experience.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-border/80 bg-background/50 p-4">
              <div className="flex items-start gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-primary/10">
                  {r.user.avatarUrl ? (
                    <OptimizedImage
                      src={r.user.avatarUrl}
                      preset="avatarSm"
                      alt=""
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary">
                      {(r.user.fullName ?? "C").charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{r.user.fullName ?? "Customer"}</p>
                      {r.bookingId && (
                        <Badge variant="verified" className="gap-1 text-[10px]">
                          <BadgeCheck className="h-3 w-3" /> Verified booking
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="h-4 w-4 fill-amber-400" />
                      <span className="text-sm">{r.rating}</span>
                    </div>
                  </div>
                  {r.comment && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.comment}</p>
                  )}
                  {r.vendorReply && (
                    <div className="mt-3 border-l-2 border-primary/30 pl-3">
                      <p className="text-xs font-medium text-muted-foreground">Vendor reply</p>
                      <p className="mt-1 text-sm">{r.vendorReply}</p>
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                    <button
                      type="button"
                      disabled
                      title="Coming soon"
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground opacity-70"
                    >
                      <ThumbsUp className="h-3 w-3" />
                      Helpful · 0
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
