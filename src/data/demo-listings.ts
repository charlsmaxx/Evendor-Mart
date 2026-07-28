import type { VendorCardData } from "@/components/marketplace/vendor-card";
import { MARKETPLACE_CATEGORIES } from "@/lib/categories";

export const DEMO_LISTINGS: VendorCardData[] = [
  {
    id: "demo-1",
    slug: "lagos-grand-ballroom",
    vendorSlug: "lagos-grand-ballroom",
    title: "Lagos Grand Ballroom",
    city: "Lagos",
    coverImage: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800",
    priceMin: 500000,
    priceMax: 2500000,
    ratingAvg: 4.9,
    reviewCount: 124,
    verified: true,
    featured: true,
    vendorName: "Lagos Grand Ballroom",
    type: "VENUE",
  },
  {
    id: "demo-2",
    slug: "premium-dj-sound",
    vendorSlug: "dj-spinmaster",
    title: "Premium DJ & Sound",
    city: "Abuja",
    coverImage: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800",
    priceMin: 150000,
    priceMax: 600000,
    ratingAvg: 4.8,
    reviewCount: 89,
    verified: true,
    featured: true,
    vendorName: "DJ SpinMaster",
    type: "SERVICE",
  },
  {
    id: "demo-3",
    slug: "luxury-african-cuisine",
    vendorSlug: "taste-of-africa-catering",
    title: "Luxury African Cuisine",
    city: "Lagos",
    coverImage: "https://images.unsplash.com/photo-1555244162-803834f70033?w=800",
    priceMin: 300000,
    priceMax: 1500000,
    ratingAvg: 4.7,
    reviewCount: 56,
    verified: true,
    featured: false,
    vendorName: "Taste of Africa Catering",
    type: "SERVICE",
  },
  {
    id: "demo-4",
    slug: "floral-stage-design",
    vendorSlug: "bloom-decor-studio",
    title: "Floral & Stage Design",
    city: "Port Harcourt",
    coverImage: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800",
    priceMin: 200000,
    priceMax: 1200000,
    ratingAvg: 4.9,
    reviewCount: 72,
    verified: true,
    featured: true,
    vendorName: "Bloom Decor Studio",
    type: "SERVICE",
  },
];

export const DEMO_STATS = [
  { value: 2400, suffix: "+", label: "Verified vendors" },
  { value: 18, suffix: "", label: "Cities covered" },
  { value: 12000, suffix: "+", label: "Events planned" },
  { value: 98, suffix: "%", label: "Happy clients" },
];

/** @deprecated Prefer MARKETPLACE_CATEGORIES from @/lib/categories */
export const DEMO_CATEGORIES = MARKETPLACE_CATEGORIES.map((c) => ({
  name: c.label,
  slug: c.slug,
  image: c.image,
  description: c.description,
}));
