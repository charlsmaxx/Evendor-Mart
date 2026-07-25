import Link from "next/link";
import { Building2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BusinessTypeSelector({ signedIn }: { signedIn: boolean }) {
  const venueHref = signedIn
    ? "/list-your-business/venue"
    : "/register?role=vendor&redirect=/list-your-business/venue";
  const vendorHref = signedIn
    ? "/list-your-business/vendor"
    : "/register?role=vendor&redirect=/list-your-business/vendor";

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Link
        href={venueHref}
        className="group rounded-2xl border-2 border-border bg-card p-6 transition hover:border-primary/40 hover:shadow-md"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Building2 className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-display text-xl font-semibold group-hover:text-primary">
          Event center / venue
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          List your hall, ballroom, garden, or event space. Set capacity, amenities, and venue-specific
          details customers need before booking.
        </p>
        <Button variant="gradient" className="mt-6 w-full" asChild>
          <span>List your venue</span>
        </Button>
      </Link>

      <Link
        href={vendorHref}
        className="group rounded-2xl border-2 border-border bg-card p-6 transition hover:border-primary/40 hover:shadow-md"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Briefcase className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-display text-xl font-semibold group-hover:text-primary">
          Service vendor
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Photographers, caterers, DJs, decorators, planners, and other event service providers — separate
          from venues in search.
        </p>
        <Button variant="outline" className="mt-6 w-full" asChild>
          <span>List your service</span>
        </Button>
      </Link>
    </div>
  );
}
