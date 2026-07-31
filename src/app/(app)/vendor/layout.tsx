import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";

import { prisma } from "@/lib/prisma";

import { DashboardSidebar } from "@/components/dashboard/sidebar";

import { VendorRouteGate } from "@/components/dashboard/vendor-route-gate";

import { VendorMobileNav } from "@/components/vendor/mobile-nav";



const links = [
  { href: "/vendor", label: "Home" },
  { href: "/vendor/bookings", label: "Bookings" },
  { href: "/vendor/manual-booking", label: "Manual Booking" },
  { href: "/vendor/calendar", label: "Calendar" },
  { href: "/vendor/crm", label: "Customers" },
  { href: "/vendor/revenue", label: "Revenue" },
  { href: "/vendor/analytics", label: "Analytics" },
  { href: "/vendor/payouts", label: "Payouts" },
  { href: "/vendor/staff", label: "Staff" },
  { href: "/vendor/services", label: "Services" },
  { href: "/vendor/portfolio", label: "Portfolio" },
  { href: "/vendor/leads", label: "Leads" },
  { href: "/messages", label: "Messages" },
  { href: "/vendor/reviews", label: "Reviews" },
  { href: "/vendor/disputes", label: "Disputes" },
  { href: "/vendor/notifications", label: "Notifications" },
  { href: "/vendor/verification", label: "Get Verified" },
  { href: "/vendor/profile", label: "Business profile" },
  { href: "/account", label: "Edit profile" },
  { href: "/vendor/subscription", label: "Subscription" },
];



export default async function VendorLayout({ children }: { children: React.ReactNode }) {

  const user = await requireAuth();

  if (!user) redirect("/login");



  let isVendor = false;

  let verified = false;

  try {

    const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });

    isVendor = user.role === "VENDOR" && !!vendor;

    verified = vendor?.verified ?? false;

  } catch {

    /* */

  }



  const navLinks = links.map((l) =>

    l.href === "/vendor/verification" && verified

      ? { ...l, label: "✓ Verified" }

      : l

  );



  return (

    <VendorRouteGate isVendor={isVendor}>

      {!isVendor ? (

        children

      ) : (

        <>

          <div className="flex flex-col gap-8 pb-24 lg:flex-row lg:pb-0">

            {/* Desktop sidebar only — mobile uses bottom nav */}
            <div className="hidden lg:block">
              <DashboardSidebar title="My Business" links={navLinks} />
            </div>

            <div className="min-w-0 flex-1">{children}</div>

          </div>

          <VendorMobileNav verified={verified} />

        </>

      )}

    </VendorRouteGate>

  );

}


