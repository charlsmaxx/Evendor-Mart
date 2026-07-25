import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BusinessTypeSelector } from "@/components/onboarding/business-type-selector";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/marketing/site-header";
import { CheckCircle2 } from "lucide-react";

const perks = [
  "Reach customers planning weddings, corporate events, and parties",
  "Manage listings, quotes, and bookings in one dashboard",
  "Get paid directly to your verified bank account",
];

function GuestLanding() {
  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">For event professionals</p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
            List on Evendor
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Choose how you want to list — event centers and service vendors have separate setup flows and appear in
            the right place when customers search.
          </p>
        </div>
        <ul className="mx-auto mt-10 max-w-md space-y-3 text-left">
          {perks.map((p) => (
            <li key={p} className="flex gap-3 text-sm text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
              {p}
            </li>
          ))}
        </ul>
        <div className="mt-12">
          <BusinessTypeSelector signedIn={false} />
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login?redirect=/list-your-business" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}

export default async function ListYourBusinessPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return <GuestLanding />;
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
    redirect("/dashboard#vendor-overview");
  }

  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Get started</p>
          <h1 className="mt-2 font-display text-3xl font-bold">What are you listing?</h1>
          <p className="mt-2 text-muted-foreground">
            Event venues and service vendors use different profiles so customers never get mixed results.
          </p>
        </div>
        <BusinessTypeSelector signedIn={true} />
        <div className="mt-8 text-center">
          <Button variant="ghost" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
