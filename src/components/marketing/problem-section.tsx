import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Users, MapPin } from "lucide-react";
import { VENUE_SHOWCASE } from "@/data/venue-showcase";

export function ProblemSection() {
  return (
    <section id="problems" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Featured Event Halls</h2>
          <p className="mt-4 text-muted-foreground">
            Stunning venues with transparent pricing and real availability.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {VENUE_SHOWCASE.map((v) => (
            <Link
              key={v.slug}
              href={`/venues/${v.slug}`}
              className="group glass overflow-hidden rounded-xl transition hover:shadow-md"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={v.image}
                  alt={v.title}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
              </div>
              <div className="p-3">
                <h3 className="font-display truncate text-sm font-semibold">{v.title}</h3>
                <div className="mt-1.5 flex flex-col gap-0.5 text-[11px] text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-2">
                  <span className="flex items-center gap-0.5">
                    <MapPin className="h-3 w-3 shrink-0" /> {v.city}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Users className="h-3 w-3 shrink-0" /> {v.capacity}
                  </span>
                </div>
                <p className="mt-1.5 text-xs font-medium text-primary">
                  From {formatCurrency(v.priceMin)}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {v.amenities.slice(0, 2).map((a) => (
                    <span key={a} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
