import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "Evendor — Africa's Premium Event Marketplace",
    template: "%s | Evendor",
  },
  description:
    "Find venues, hire trusted vendors, and manage your event seamlessly — all in one place.",
  openGraph: {
    title: "Evendor — Africa's Premium Event Marketplace",
    description: "Discover, compare, and book event vendors across Africa.",
    type: "website",
    locale: "en_NG",
    siteName: "Evendor",
  },
  twitter: {
    card: "summary_large_image",
    title: "Evendor",
    description: "Africa's premium event marketplace",
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/logo-icon.png", type: "image/png" }],
    apple: [{ url: "/logo-icon.png", type: "image/png" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Evendor",
      url: process.env.NEXT_PUBLIC_APP_URL,
      description: "Event marketplace for Africa",
    },
    {
      "@type": "WebSite",
      name: "Evendor",
      url: process.env.NEXT_PUBLIC_APP_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
