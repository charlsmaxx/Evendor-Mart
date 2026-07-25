import { SectionShell } from "@/components/shared/section-shell";

const benefits = [
  {
    icon: "🎁",
    title: "Earn 2% Cashback",
    desc: "Earn rewards every time you book through Evendor. Rewards accumulate and can be applied to your next booking.",
  },
  {
    icon: "🛡",
    title: "Booking Protection",
    desc: "Every booking is secured and protected through our platform. Book with complete confidence.",
  },
  {
    icon: "⭐",
    title: "Verified Vendors",
    desc: "Work only with trusted, verified event professionals who meet our quality standards.",
  },
  {
    icon: "💳",
    title: "Secure Payments",
    desc: "Pay confidently through our protected payment platform — your full payment stays in escrow until the job is done.",
  },
];

export function RewardsSection() {
  return (
    <SectionShell id="rewards">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          Exclusive Member Benefits
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
          Exclusive Benefits For Booking Through Evendor
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Every booking comes with rewards, protection, and peace of mind.
        </p>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((b) => (
          <div
            key={b.title}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
          >
            <div
              className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background:
                  "linear-gradient(135deg, rgba(122,46,61,0.05) 0%, rgba(229,223,217,0.12) 100%)",
              }}
            />
            <span className="relative text-3xl">{b.icon}</span>
            <h3 className="relative mt-4 font-display text-lg font-semibold">{b.title}</h3>
            <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{b.desc}</p>

            {b.icon === "🎁" && (
              <div className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Premium Benefit
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        className="mt-14 flex flex-col items-center gap-4 rounded-2xl border border-primary/20 p-8 text-center sm:flex-row sm:justify-between sm:text-left"
        style={{
          background: "linear-gradient(135deg, rgba(122,46,61,0.07) 0%, rgba(229,223,217,0.15) 100%)",
        }}
      >
        <div>
          <p className="font-display text-xl font-bold">
            🎁 Every booking earns you 2% back
          </p>
          <p className="mt-1 text-muted-foreground">
            Accumulate Evendor Rewards and apply them to future bookings.
          </p>
        </div>
        <div className="shrink-0 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
          Exclusive Booking Rewards
        </div>
      </div>
    </SectionShell>
  );
}
