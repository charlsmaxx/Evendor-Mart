import { OptimizedImage } from "@/components/ui/optimized-image";
import { Star } from "lucide-react";
import { isVideoMedia } from "@/lib/vendor-media";

interface PortfolioProps {
  items: { id: string; url: string }[];
}

export function ListingPortfolio({ items }: PortfolioProps) {
  if (items.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="font-display text-xl font-semibold">Portfolio</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black">
            {isVideoMedia(item) ? (
              <video src={item.url} className="h-full w-full object-cover" controls />
            ) : (
              <OptimizedImage src={item.url} preset="portfolio" alt="Portfolio" fill className="object-cover" sizes="33vw" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  vendorReply: string | null;
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
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{r.user.fullName ?? "Customer"}</p>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="h-4 w-4 fill-amber-400" />
                      <span className="text-sm">{r.rating}</span>
                    </div>
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
                  {r.vendorReply && (
                    <div className="mt-3 border-l-2 border-primary/30 pl-3">
                      <p className="text-xs font-medium text-muted-foreground">Vendor reply</p>
                      <p className="mt-1 text-sm">{r.vendorReply}</p>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
