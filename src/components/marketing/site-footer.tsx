import Link from "next/link";
import { Facebook, Instagram, Youtube } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { NewsletterForm } from "@/components/marketing/newsletter-form";
import { getWhatsAppHref } from "@/lib/whatsapp";

const footerLinks = {
  Product: [
    { href: "/marketplace", label: "Marketplace" },
    { href: "/#categories", label: "Categories" },
    { href: "/list-your-business", label: "List your business" },
  ],
  Company: [
    { href: "/about", label: "About" },
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
  ],
};

const SUPPORT_EMAIL = "hello@evendor.ng";
const SUPPORT_WHATSAPP_DISPLAY = "+2347066997479";

const SOCIAL_LINKS: { href: string; label: string; icon: typeof Facebook }[] = [
  {
    href: "https://www.facebook.com/profile.php?id=61590498944742",
    label: "Facebook",
    icon: Facebook,
  },
  {
    href: "https://www.youtube.com/@Evendor-n2d",
    label: "YouTube",
    icon: Youtube,
  },
];

if (process.env.NEXT_PUBLIC_INSTAGRAM_URL) {
  SOCIAL_LINKS.splice(1, 0, {
    href: process.env.NEXT_PUBLIC_INSTAGRAM_URL,
    label: "Instagram",
    icon: Instagram,
  });
}

export function SiteFooter() {
  const whatsappHref =
    getWhatsAppHref("Hi Evendor, I need help with…") ??
    `https://wa.me/2347066997479?text=${encodeURIComponent("Hi Evendor, I need help with…")}`;

  return (
    <footer className="border-t border-border bg-secondary/50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-4">
          <div>
            <BrandLogo href="/" heightClass="h-[68px]" />
            <p className="mt-3 text-sm text-muted-foreground">
              Africa&apos;s premium event marketplace. Discover, compare, book.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
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
            <h4 className="font-semibold">Support</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-foreground">
                  Email: {SUPPORT_EMAIL}
                </a>
              </li>
              <li>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  WhatsApp: {SUPPORT_WHATSAPP_DISPLAY}
                </a>
              </li>
            </ul>
          </div>
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
