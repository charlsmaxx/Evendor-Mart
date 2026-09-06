import { BrandLoader } from "@/components/loading/brand-loader";
import { MarketplacePageSkeleton } from "@/components/loading/marketplace-skeleton";

export default function MarketplaceLoading() {
  return (
    <div>
      <div className="mb-6 flex justify-center">
        <BrandLoader size="md" />
      </div>
      <MarketplacePageSkeleton />
    </div>
  );
}
