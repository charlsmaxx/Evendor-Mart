import { VendorReviewsPanel } from "@/components/dashboard/vendor-reviews-panel";

export default function VendorReviewsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Reviews</h1>
      <p className="mt-2 text-muted-foreground">
        Read customer feedback and reply to build trust on your listings.
      </p>
      <div className="mt-8 max-w-2xl">
        <VendorReviewsPanel />
      </div>
    </div>
  );
}
