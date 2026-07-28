"use client";

import { useEffect, useState, useCallback } from "react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function ListingGalleryHero({ images, title }: { images: string[]; title: string }) {
  const gallery = images.filter(Boolean);
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const current = gallery[active] ?? gallery[0];

  const goPrev = useCallback(() => {
    setActive((i) => (i > 0 ? i - 1 : gallery.length - 1));
  }, [gallery.length]);

  const goNext = useCallback(() => {
    setActive((i) => (i < gallery.length - 1 ? i + 1 : 0));
  }, [gallery.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
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
  }, [goNext, goPrev, lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen || gallery.length < 2) return;
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
  }, [gallery.length, goNext, goPrev, lightboxOpen]);

  if (!current) return null;

  return (
    <>
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-muted md:aspect-[21/9]">
        <button
          type="button"
          className="absolute inset-0 z-[1]"
          onClick={() => setLightboxOpen(true)}
          aria-label="View gallery"
        />
        <OptimizedImage
          src={current}
          preset="hero"
          alt={`${title} photo ${active + 1}`}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        {gallery.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-3 top-1/2 z-[2] -translate-y-1/2 rounded-full bg-black/45 p-2 text-white hover:bg-black/60"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-3 top-1/2 z-[2] -translate-y-1/2 rounded-full bg-black/45 p-2 text-white hover:bg-black/60"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <p className="absolute bottom-3 right-3 z-[2] rounded-full bg-black/50 px-2.5 py-1 text-xs text-white">
              {active + 1} / {gallery.length}
            </p>
          </>
        )}
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          {gallery.length > 1 && (
            <>
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
            </>
          )}
          <div
            className="relative mx-4 flex max-h-[85vh] w-full max-w-5xl items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gallery[active]}
              alt={`${title} photo ${active + 1}`}
              className="max-h-[85vh] w-auto max-w-full rounded-lg object-contain"
            />
          </div>
          {gallery.length > 1 && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80">
              {active + 1} / {gallery.length}
            </p>
          )}
        </div>
      )}
    </>
  );
}
