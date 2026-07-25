import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { NewsletterForm } from "@/components/marketing/newsletter-form";

const footerLinks = {
  Product: [
    { href: "/marketplace", label: "Marketplace" },
    { href: "#categories", label: "Categories" },
    { href: "/list-your-business", label: "List your business" },
  ],
  Company: [
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
  ],
  Support: [
    { href: "/login", label: "Log in" },
    { href: "/register", label: "Sign up" },
  ],
};

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-4">
          <div>
            <BrandLogo href="/" heightClass="h-[68px]" />
            <p className="mt-3 text-sm text-muted-foreground">
              Africa&apos;s premium event marketplace. Discover, compare, book.
            </p>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold">{title}</h4>
              <ul className="mt-4 space-y-2">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h4 className="font-semibold">Newsletter</h4>
            <p className="mt-2 text-sm text-muted-foreground">Event tips & vendor spotlights.</p>
            <NewsletterForm />
          </div>
        </div>
        <p className="mt-12 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Evendor. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
