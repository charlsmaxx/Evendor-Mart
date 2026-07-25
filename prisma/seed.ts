import { PrismaClient, VendorCategory, ListingType, ListingStatus } from "@prisma/client";
import { slugify } from "../src/lib/utils";
import { marketplaceCategorySeedRows, vendorCategoryToSlug } from "../src/lib/categories";

const prisma = new PrismaClient();

const categories = marketplaceCategorySeedRows();

const demoVendors = [
  {
    businessName: "Lagos Grand Ballroom",
    category: VendorCategory.VENUE,
    city: "Lagos",
    type: ListingType.VENUE,
    title: "Lagos Grand Ballroom",
    priceMin: 500000,
    priceMax: 2500000,
    capacity: 500,
    verified: true,
    featured: true,
    image: "https://images.unsplash.com/photo-1519167758481-83f29da8c4f5?w=800",
  },
  {
    businessName: "DJ SpinMaster",
    category: VendorCategory.DJ,
    city: "Abuja",
    type: ListingType.SERVICE,
    title: "Premium DJ & Sound",
    priceMin: 150000,
    priceMax: 600000,
    verified: true,
    featured: true,
    image: "https://images.unsplash.com/photo-1571266028243-e68f8574c9b9?w=800",
  },
  {
    businessName: "Taste of Africa Catering",
    category: VendorCategory.CATERER,
    city: "Lagos",
    type: ListingType.SERVICE,
    title: "Luxury African Cuisine",
    priceMin: 300000,
    priceMax: 1500000,
    verified: true,
    featured: false,
    image: "https://images.unsplash.com/photo-1555244162-803834f70033?w=800",
  },
  {
    businessName: "Bloom Decor Studio",
    category: VendorCategory.DECORATOR,
    city: "Port Harcourt",
    type: ListingType.SERVICE,
    title: "Floral & Stage Design",
    priceMin: 200000,
    priceMax: 1200000,
    verified: true,
    featured: true,
    image: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800",
  },
  {
    businessName: "MC Kingsley",
    category: VendorCategory.MC,
    city: "Lagos",
    type: ListingType.SERVICE,
    title: "Corporate & Wedding MC",
    priceMin: 100000,
    priceMax: 400000,
    verified: false,
    featured: false,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
  },
  {
    businessName: "Lens & Light Photography",
    category: VendorCategory.PHOTOGRAPHER,
    city: "Accra",
    type: ListingType.SERVICE,
    title: "Cinematic Event Photography",
    priceMin: 250000,
    priceMax: 900000,
    verified: true,
    featured: true,
    image: "https://images.unsplash.com/photo-1492681290082-93253102142c?w=800",
  },
];

async function main() {
  console.log("Seeding Evendor...");

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, sortOrder: cat.sortOrder },
      create: cat,
    });
  }

  const adminId = "00000000-0000-0000-0000-000000000001";
  await prisma.user.upsert({
    where: { id: adminId },
    update: {},
    create: {
      id: adminId,
      email: "admin@evendor.app",
      fullName: "Evendor Admin",
      role: "ADMIN",
      onboardingComplete: true,
      city: "Lagos",
    },
  });

  const catMap = Object.fromEntries(
    (await prisma.category.findMany()).map((c) => [c.slug, c.id])
  );

  const categorySlugMap = vendorCategoryToSlug as Record<VendorCategory, string>;

  for (let i = 0; i < demoVendors.length; i++) {
    const v = demoVendors[i];
    const userId = `10000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`;
    const slug = slugify(v.businessName);

    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `vendor${i + 1}@evendor.app`,
        fullName: v.businessName,
        role: "VENDOR",
        onboardingComplete: true,
        city: v.city,
      },
    });

    const vendor = await prisma.vendorProfile.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        businessName: v.businessName,
        slug,
        category: v.category,
        city: v.city,
        verified: v.verified,
        featured: v.featured,
        bio: `Premium ${v.category.toLowerCase()} services in ${v.city}.`,
        ratingAvg: 4.5 + (i % 5) * 0.1,
        reviewCount: 20 + i * 5,
        subscriptionTier: v.featured ? "PREMIUM" : "FREE",
      },
    });

    const listingSlug = slugify(v.title);
    const categoryId = catMap[categorySlugMap[v.category]];

    const listing = await prisma.listing.upsert({
      where: { slug: listingSlug },
      update: {},
      create: {
        vendorId: vendor.id,
        categoryId,
        type: v.type,
        title: v.title,
        slug: listingSlug,
        description: `${v.title} — trusted event partner on Evendor. Book with confidence.`,
        city: v.city,
        priceMin: v.priceMin,
        priceMax: v.priceMax,
        status: ListingStatus.PUBLISHED,
        featured: v.featured,
        verified: v.verified,
        coverImage: v.image,
        images: [v.image],
        ratingAvg: vendor.ratingAvg,
        reviewCount: vendor.reviewCount,
      },
    });

    if (v.type === "VENUE" && "capacity" in v) {
      await prisma.venueDetails.upsert({
        where: { listingId: listing.id },
        update: {},
        create: {
          listingId: listing.id,
          capacity: v.capacity as number,
          amenities: ["Parking", "AC", "Stage", "Catering kitchen", "VIP lounge"],
          address: `${v.city}, Nigeria`,
        },
      });
    }
  }

  const customerId = "20000000-0000-0000-0000-000000000001";
  await prisma.user.upsert({
    where: { id: customerId },
    update: {},
    create: {
      id: customerId,
      email: "customer@evendor.app",
      fullName: "Ada Okonkwo",
      role: "CUSTOMER",
      onboardingComplete: true,
      city: "Lagos",
    },
  });

  const publishedListings = await prisma.listing.findMany({
    where: { status: "PUBLISHED" },
    take: 3,
  });

  const sampleReviews = [
    { rating: 5, comment: "Absolutely stunning venue — our wedding was flawless." },
    { rating: 4, comment: "Great service and communication throughout the event." },
    { rating: 5, comment: "Exceeded expectations. Would book again without hesitation." },
  ];

  for (let i = 0; i < publishedListings.length; i++) {
    const listing = publishedListings[i];
    await prisma.review.upsert({
      where: {
        listingId_userId: { listingId: listing.id, userId: customerId },
      },
      update: {},
      create: {
        listingId: listing.id,
        userId: customerId,
        rating: sampleReviews[i]?.rating ?? 5,
        comment: sampleReviews[i]?.comment,
      },
    });
  }

  const firstVendor = await prisma.vendorProfile.findFirst({
    include: { listings: { take: 1 } },
  });
  if (firstVendor?.listings[0]) {
    const existingMedia = await prisma.portfolioMedia.count({
      where: { vendorId: firstVendor.id },
    });
    if (existingMedia === 0) {
      await prisma.portfolioMedia.createMany({
        data: [
          {
            vendorId: firstVendor.id,
            listingId: firstVendor.listings[0].id,
            url: "https://images.unsplash.com/photo-1519167758481-83f29da8c4f5?w=800",
            publicId: "seed_portfolio_1",
            sortOrder: 0,
          },
          {
            vendorId: firstVendor.id,
            url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800",
            publicId: "seed_portfolio_2",
            sortOrder: 1,
          },
        ],
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
