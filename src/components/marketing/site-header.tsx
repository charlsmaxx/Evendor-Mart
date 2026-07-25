"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

const links = [
  { href: "#categories", label: "Categories" },
  { href: "#how-it-works", label: "How it works" },
  { href: "/marketplace", label: "Marketplace" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandLogo heightClass="h-[68px]" />
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link href="/register?redirect=/dashboard">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-background p-4 md:hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="block py-2 text-sm" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/login"><Button variant="outline" className="w-full">Log in</Button></Link>
            <Link href="/register?redirect=/dashboard"><Button className="w-full">Get started</Button></Link>
          </div>
        </div>
      )}
    </header>
  );
}
