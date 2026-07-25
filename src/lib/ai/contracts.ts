import { prisma } from "@/lib/prisma";

export interface RecommendationInput {
  city?: string;
  categorySlug?: string;
  budgetMax?: number;
}

export async function recommendVendors(input: RecommendationInput) {
  const category = input.categorySlug
    ? await prisma.category.findUnique({ where: { slug: input.categorySlug } })
    : null;

  return prisma.listing.findMany({
    where: {
      status: "PUBLISHED",
      ...(input.city ? { city: { contains: input.city, mode: "insensitive" } } : {}),
      ...(category ? { categoryId: category.id } : {}),
      ...(input.budgetMax ? { priceMin: { lte: input.budgetMax } } : {}),
    },
    orderBy: [{ featured: "desc" }, { ratingAvg: "desc" }],
    take: 10,
    include: {
      vendor: true,
      category: true,
    },
  });
}
