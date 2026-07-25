import dynamic from "next/dynamic";
import { VenueCalendarSkeleton } from "@/components/loading/venue-calendar-skeleton";

const VenueCalendar = dynamic(
  () => import("@/components/vendor/venue-calendar").then((m) => ({ default: m.VenueCalendar })),
  { loading: () => <VenueCalendarSkeleton /> }
);

export default function VendorCalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Calendar & Availability</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Day, week, and month views — block dates, bulk manage availability, and see bookings at a glance.
        </p>
      </div>
      <VenueCalendar />
    </div>
  );
}
