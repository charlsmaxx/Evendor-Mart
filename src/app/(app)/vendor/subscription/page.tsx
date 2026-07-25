import { Suspense } from "react";
import { VendorSubscriptionContent } from "@/components/vendor/vendor-subscription-content";

export default function VendorSubscriptionPage() {
  return (
    <Suspense>
      <VendorSubscriptionContent />
    </Suspense>
  );
}
