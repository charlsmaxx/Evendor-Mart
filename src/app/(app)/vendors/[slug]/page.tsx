import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getVendorPublicProfileCached } from "@/lib/vendor-profile";
import { VendorProfileView } from "@/components/marketplace/vendor-profile-view";
import { buildVendorJsonLd } from "@/lib/vendor-onboarding/seo";
import { parseDraft } from "@/lib/vendor-onboarding/types";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://evendor.com";

export const revalidate = 180;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getVendorPublicProfileCached(slug);
  if (!profile) return { title: "Vendor" };

  const { seo, vendor, coverImage } = profile;
  const title = seo?.title ?? `${vendor.businessName} | Evendor`;
  const description = seo?.description ?? vendor.bio ?? `Book ${vendor.businessName} on Evendor.`;
  const canonical = `${SITE_URL}/vendors/${vendor.slug}`;
  const ogImage = seo?.openGraphImage ?? coverImage;

  return {
    title,
    description,
    alternates: { canonical },
    keywords: seo?.keywords,
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Evendor",
      type: "website",
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: vendor.businessName }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function VendorProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await getVendorPublicProfileCached(slug);

  if (!profile) notFound();

  const meta = (profile.vendor.metadata as Record<string, unknown>) ?? {};
  const draft = parseDraft(meta.onboardingDraft, (meta.businessKind as "VENUE" | "SERVICE") ?? "SERVICE");
  if (!draft.step1.businessName) draft.step1.businessName = profile.vendor.businessName;
  if (!draft.step1.slug) draft.step1.slug = profile.vendor.slug;
  if (!draft.step1.description && profile.vendor.bio) draft.step1.description = profile.vendor.bio;
  if (!draft.step2.city) draft.step2.city = profile.vendor.city;
  const jsonLd = buildVendorJsonLd(draft, {
    ratingAvg: profile.ratingAvg,
    reviewCount: profile.reviewCount,
    verified: profile.vendor.verified,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <VendorProfileView data={profile} />
    </>
  );
}
