import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ListingForm } from "@/components/dashboard/listing-form";
import { PublishListingButton } from "@/components/dashboard/publish-listing-button";
import { ListingActions } from "@/components/dashboard/listing-actions";
import { formatCurrency } from "@/lib/utils";
import { resolveCategoryIdForVendor } from "@/lib/vendor-listings";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import type { Prisma } from "@prisma/client";

type VendorListing = Prisma.ListingGetPayload<{ include: { category: true } }>;

export default async function VendorListingsPage() {
  const user = await requireAuth();
  let listings: VendorListing[] = [];
  let categoryId: string | undefined;

  try {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: user?.id },
      include: { listings: { include: { category: true } } },
    });
    listings = vendor?.listings ?? [];
    if (vendor) {
      categoryId = (await resolveCategoryIdForVendor(vendor.category)) ?? undefined;
    }
  } catch {
    /* demo */
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Listings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Published listings appear in the marketplace and can be found by category or name.
      </p>
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <ListingForm categoryId={categoryId} />
        <div className="space-y-4">
          {listings.map((l) => (
            <div key={l.id} className="glass rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{l.title}</p>
                    <Badge variant={l.status === "PUBLISHED" ? "verified" : "secondary"}>
                      {l.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {l.category?.name ?? "Category"} · {formatCurrency(l.priceMin)}+
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/vendor/listings/${l.id}/edit`}>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  </Link>
                  {l.status !== "PUBLISHED" && l.status !== "ARCHIVED" && (
                    <PublishListingButton listingId={l.id} />
                  )}
                  {l.status === "PUBLISHED" && (
                    <Link href={`/listings/${l.slug}`}>
                      <Button size="sm" variant="outline">View on marketplace</Button>
                    </Link>
                  )}
                  <ListingActions listingId={l.id} status={l.status} />
                </div>              </div>
            </div>
          ))}
          {listings.length === 0 && (
            <p className="text-muted-foreground">
              No listings yet. Complete your business profile or create one below — it will go live on the marketplace.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
