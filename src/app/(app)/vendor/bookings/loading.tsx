import { BrandLoader } from "@/components/loading/brand-loader";
import { VendorBookingsSkeleton } from "@/components/loading/vendor-bookings-skeleton";

export default function VendorBookingsLoading() {
  return (
    <div>
      <div className="mb-6 flex justify-center">
        <BrandLoader size="md" />
      </div>
      <VendorBookingsSkeleton />
    </div>
  );
}
