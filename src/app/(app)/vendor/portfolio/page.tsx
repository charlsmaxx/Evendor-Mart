import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { PortfolioManager } from "@/components/dashboard/portfolio-manager";

export default async function VendorPortfolioPage() {
  const user = await requireAuth();
  let listings: { id: string; title: string }[] = [];

  try {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: user?.id },
      include: { listings: { select: { id: true, title: true } } },
    });
    listings = vendor?.listings ?? [];
  } catch {
    /* demo */
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Portfolio</h1>
      <p className="mt-2 text-muted-foreground">
        Showcase your best work. Paste image URLs or upload via Cloudinary.
      </p>
      <div className="mt-8">
        <PortfolioManager listings={listings} />
      </div>
    </div>
  );
}
