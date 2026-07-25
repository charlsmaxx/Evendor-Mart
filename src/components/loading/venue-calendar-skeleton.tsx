export function VenueCalendarSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex justify-between">
        <div className="h-8 w-40 rounded-lg bg-muted" />
        <div className="h-9 w-56 rounded-lg bg-muted" />
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
