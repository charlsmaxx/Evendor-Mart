import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UnifiedDashboard } from "@/components/dashboard/unified-dashboard";

export default async function DashboardPage() {
  const user = await requireAuth();
  if (!user) redirect("/login?redirect=/dashboard");

  let vendorStats = null;
  let isVendor = false;

  try {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: user.id },
    });

    isVendor = user.role === "VENDOR" && !!vendor;

    if (vendor) {
      const leads = await prisma.quoteRequest.count({ where: { vendorId: vendor.id } });
      const bookings = await prisma.booking.count({ where: { vendorId: vendor.id } });
      const views = await prisma.analyticsEvent.count({
        where: { vendorId: vendor.id, eventType: "VIEW" },
      });
      vendorStats = {
        views,
        leads,
        bookings,
        businessName: vendor.businessName,
      };
    }
  } catch {
    /* demo fallback handled in UI */
  }

  return (
    <UnifiedDashboard
      user={{
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
      }}
      isVendor={isVendor}
      vendorStats={vendorStats}
    />
  );
}
