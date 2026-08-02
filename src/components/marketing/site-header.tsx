"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { MobileNavDrawer } from "@/components/mobile-nav-drawer";
import { CategoriesDesktopDropdown } from "@/components/categories-menu";

type MeUser = {
  id: string;
  fullName: string | null;
  email: string;
  role: string;
};

const desktopLinks = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/marketplace", label: "Marketplace" },
];

async function fetchMe(): Promise<MeUser | null> {
  const res = await fetch("/api/me", { credentials: "same-origin" });
  if (res.status === 401 || !res.ok) return null;
  const json = await res.json();
  return (json.data as MeUser) ?? null;
}

export function SiteHeader() {
  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: 5 * 60_000,
    retry: false,
  });

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandLogo heightClass="h-[68px]" />

        <nav className="hidden items-center gap-8 md:flex">
          <CategoriesDesktopDropdown />
          {desktopLinks.map((l) => (
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
          {isLoading ? (
            <div className="h-9 w-28 animate-pulse rounded-full bg-muted" />
          ) : me ? (
            <Link href="/dashboard">
              <Button size="sm">Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/register?redirect=/dashboard">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>

        <MobileNavDrawer />
      </div>
    </header>
  );
}
