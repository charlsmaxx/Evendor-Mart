import { Check } from "lucide-react";
import type { ServiceRequirement } from "@/lib/vendor-profile-content";

export function ServiceRequirementsSection({
  requirements,
}: {
  requirements: ServiceRequirement[];
}) {
  if (requirements.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-semibold">Service Requirements</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Please review these requirements before booking.
      </p>
      <ul className="mt-5 space-y-3">
        {requirements.map((r) => (
          <li key={r.id} className="flex items-start gap-3 text-sm">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="h-3.5 w-3.5" />
            </span>
            <span className="leading-relaxed text-foreground">{r.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
