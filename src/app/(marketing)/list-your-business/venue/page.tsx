import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/marketing/site-header";
import { VendorOnboardingWizard } from "@/components/onboarding/vendor-onboarding-wizard";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "List your event center" };

export default async function ListVenuePage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/register?role=vendor&redirect=/list-your-business/venue");
  }

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: { vendorProfile: true },
    });
  } catch {
    /* DB unavailable */
  }

  if (dbUser?.role === "VENDOR" && dbUser.onboardingComplete && dbUser.vendorProfile) {
    redirect("/vendor/listings");
  }

  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Link href="/list-your-business" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Choose listing type
        </Link>
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Event center</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Set up your venue profile</h1>
          <p className="mt-2 text-muted-foreground">
            Capacity, amenities, address, and bank details — tailored for halls and event spaces.
          </p>
        </div>
        <VendorOnboardingWizard businessKind="VENUE" />
      </div>
    </>
  );
}
