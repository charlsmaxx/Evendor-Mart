import type { VendorOnboardingDraft } from "@/lib/vendor-onboarding/types";
import { CATEGORY_LABELS, getCategoryLabel } from "@/lib/categories";

export type VendorSeoPayload = {
  title: string;
  description: string;
  canonicalPath: string;
  keywords: string[];
  openGraphImage?: string;
};

export { CATEGORY_LABELS };

function categoryLabel(category: string) {
  return getCategoryLabel(category);
}

export function generateVendorSeo(draft: VendorOnboardingDraft): VendorSeoPayload {
  const { step1, step2, step3, step7 } = draft;
  const cat = categoryLabel(step1.category);
  const city = step2.city || "Nigeria";
  const state = step2.state ? `, ${step2.state}` : "";
  const name = step1.businessName || "Evendor Vendor";

  const serviceNames = step3.services.map((s) => s.name).filter(Boolean).slice(0, 3);
  const servicePhrase = serviceNames.length ? ` — ${serviceNames.join(", ")}` : "";

  const title = `${cat} in ${city}${state} | ${name} | Evendor`;
  const description =
    step1.tagline ||
    `Book ${name} on Evendor. Professional ${cat.toLowerCase()} serving ${city}${state} and surrounding areas.${servicePhrase}`;

  const keywords = [
    `${cat} in ${city}`,
    `${cat} in ${step2.state || city}`,
    `Best ${cat} in ${city}`,
    ...step7.specialties,
    ...step7.keywords,
    ...step7.tags,
    ...step3.services.map((s) => `${s.name} ${city}`).filter(Boolean),
  ]
    .map((k) => k.trim())
    .filter(Boolean);

  const uniqueKeywords = [...new Set(keywords)].slice(0, 30);

  return {
    title: title.slice(0, 70),
    description: description.slice(0, 160),
    canonicalPath: `/vendors/${step1.slug || "vendor"}`,
    keywords: uniqueKeywords,
    openGraphImage: step1.coverImageUrl ?? step1.avatarUrl ?? undefined,
  };
}

export function buildVendorJsonLd(
  draft: VendorOnboardingDraft,
  opts: { ratingAvg?: number; reviewCount?: number; verified?: boolean }
) {
  const seo = generateVendorSeo(draft);
  const { step1, step2, step3 } = draft;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        name: step1.businessName,
        description: step1.description || seo.description,
        image: step1.coverImageUrl ?? step1.avatarUrl,
        url: `https://evendor.com${seo.canonicalPath}`,
        address: {
          "@type": "PostalAddress",
          streetAddress: step2.address,
          addressLocality: step2.city,
          addressRegion: step2.state,
          addressCountry: step2.country,
        },
        aggregateRating:
          opts.reviewCount && opts.reviewCount > 0
            ? {
                "@type": "AggregateRating",
                ratingValue: opts.ratingAvg ?? 0,
                reviewCount: opts.reviewCount,
              }
            : undefined,
      },
      ...step3.services
        .filter((s) => s.name)
        .map((service) => ({
          "@type": "Service",
          name: service.name,
          description: service.description,
          provider: { "@type": "LocalBusiness", name: step1.businessName },
          areaServed: step2.city,
          offers: {
            "@type": "Offer",
            priceCurrency: "NGN",
            price: service.priceMin,
          },
        })),
    ],
  };
}
