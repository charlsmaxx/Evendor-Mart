import Link from "next/link";
import { SiteFooter } from "@/components/marketing/site-footer";

export function LegalDocumentLayout({
  title,
  version,
  effectiveDate,
  children,
}: {
  title: string;
  version: string;
  effectiveDate: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <article className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Legal</p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Version {version} · Effective {effectiveDate}
        </p>
        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-foreground/90">
          {children}
        </div>
        <p className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
          Questions? Email{" "}
          <a className="font-medium text-primary hover:underline" href="mailto:hello@evendor.ng">
            hello@evendor.ng
          </a>
          . You can also read our{" "}
          <Link href="/terms" className="font-medium text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-medium text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </article>
      <SiteFooter />
    </>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}
