import { notFound } from "next/navigation";
import { getPublishedListingBySlugCached } from "@/core/search-engine/listings";
import { ListingDetailView } from "@/components/marketplace/listing-detail-view";

export const revalidate = 120;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = await getPublishedListingBySlugCached(slug);
  if (!listing) return { title: "Listing not found" };
  return {
    title: `${listing.title} — ${listing.vendor.businessName}`,
    description: listing.description.slice(0, 160),
  };
}

export default async function ListingDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = await getPublishedListingBySlugCached(slug);
  if (!listing) notFound();

  return <ListingDetailView listing={listing} />;
}
