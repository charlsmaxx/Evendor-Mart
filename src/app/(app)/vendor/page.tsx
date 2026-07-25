import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BecomeVendorCard } from "@/components/dashboard/become-vendor-card";
import { VendorOverview } from "@/components/vendor/vendor-overview";

export default async function VendorEntryPage() {
  const user = await requireAuth();
  if (!user) redirect("/login?redirect=/vendor");

  let vendor = null;
  try {
    vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
  } catch { /* */ }

  const isVendor = user.role === "VENDOR" && !!vendor;

  if (!isVendor) return <BecomeVendorCard isLoggedIn />;

  return <VendorOverview businessName={vendor!.businessName} />;
}
