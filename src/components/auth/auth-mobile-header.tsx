"use client";

import { BrandLogo } from "@/components/brand-logo";
import { MobileNavDrawer } from "@/components/mobile-nav-drawer";

/** Mobile-only top bar so auth pages also get the global hamburger menu. */
export function AuthMobileHeader() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md md:hidden">
      <div className="flex h-16 items-center justify-between px-4">
        <BrandLogo href="/" heightClass="h-12" />
        <MobileNavDrawer />
      </div>
    </header>
  );
}
