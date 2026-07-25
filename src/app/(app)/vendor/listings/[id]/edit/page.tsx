"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ListingForm } from "@/components/dashboard/listing-form";
import { VendorPageHeader, VendorSkeleton } from "@/components/vendor/vendor-ui";
import { Button } from "@/components/ui/button";

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const res = await fetch(`/api/listings/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed to load listing");
      return json.data;
    },
  });

  if (isLoading) return <VendorSkeleton />;

  if (error || !data) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Listing not found or you don&apos;t have access.</p>
        <Link href="/vendor/listings">
          <Button variant="outline">Back to listings</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <VendorPageHeader
        title="Edit listing"
        subtitle={data.title}
        action={
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        }
      />
      <div className="max-w-2xl">
        <ListingForm listing={data} />
      </div>
    </div>
  );
}
