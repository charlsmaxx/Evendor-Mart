import Link from "next/link";
import { Store, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACTIONS = [
  {
    href: "/register",
    label: "Sign up",
    desc: "Create a free account",
    icon: UserPlus,
    primary: true,
  },
  {
    href: "/list-your-business",
    label: "List your business",
    desc: "Add venues or services",
    icon: Store,
    primary: false,
  },
] as const;

export function HeroCtaSection() {
  return (
    <section
      id="hero-cta"
      className="relative z-10 border-b border-border bg-background pt-14 pb-8 md:pt-16 md:pb-10"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Ready to get started?
          </h2>
          <p className="mx-auto mt-1.5 max-w-lg text-sm text-muted-foreground">
            Sign up to plan your next event, or grow your business on Evendor.
          </p>
        </div>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2 sm:gap-3">
          {ACTIONS.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="group flex flex-col items-center rounded-xl border border-border bg-card px-3 py-3.5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <span
                className={
                  action.primary
                    ? "flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    : "flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"
                }
              >
                <action.icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <p className="mt-2.5 text-sm font-semibold text-foreground">{action.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{action.desc}</p>
              <Button
                size="sm"
                variant={action.primary ? "gradient" : "outline"}
                className="mt-3 h-8 pointer-events-none px-3 text-xs"
                tabIndex={-1}
              >
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
