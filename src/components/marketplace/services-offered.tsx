import { Badge } from "@/components/ui/badge";

export function ServicesOfferedSection({
  services,
  title = "Services",
}: {
  services: string[];
  title?: string;
}) {
  if (services.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {services.map((s) => (
          <Badge key={s} variant="secondary" className="px-3 py-1.5 text-sm font-medium">
            {s}
          </Badge>
        ))}
      </div>
    </section>
  );
}
