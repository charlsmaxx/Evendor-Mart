import { formatCancellationPolicyLines, type VendorPackage } from "@/lib/vendor-packages";

export function CancellationPolicyCard({ packages }: { packages: VendorPackage[] }) {
  const enabled = packages.filter((p) => p.enabled);
  if (enabled.length === 0) return null;

  const featured =
    enabled.find((p) => p.badge === "POPULAR") ??
    enabled.find((p) => p.cancellationPolicy) ??
    enabled[0];

  if (!featured?.cancellationPolicy) return null;

  const lines = formatCancellationPolicyLines(featured.cancellationPolicy);
  if (lines.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-muted/30 p-6">
      <h2 className="font-display text-xl font-semibold">Cancellation policy</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Based on {featured.name}. Exact terms apply to the package you select at booking.
      </p>
      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        {lines.map((line) => (
          <li key={line} className="leading-relaxed">
            {line}
          </li>
        ))}
      </ul>
      {featured.cancellationPolicy.notes && (
        <p className="mt-3 text-sm text-foreground">{featured.cancellationPolicy.notes}</p>
      )}
    </section>
  );
}
