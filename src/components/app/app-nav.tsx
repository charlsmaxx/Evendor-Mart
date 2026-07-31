"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { Heart, LayoutGrid, MessageSquare, Store, Gift, type LucideIcon } from "lucide-react";
import { useMessageBadgeCount, MessageNotificationBadge } from "@/components/messages/message-notification-badge";
import { BrandLogo } from "@/components/brand-logo";
import { MobileNavDrawer } from "@/components/mobile-nav-drawer";
import { CategoriesDesktopDropdown } from "@/components/categories-menu";

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: boolean;
  rewards?: boolean;
};

const guestLinks: NavLink[] = [
  { href: "/marketplace", label: "Marketplace", icon: LayoutGrid },
];

const authLinks: NavLink[] = [
  { href: "/marketplace", label: "Marketplace", icon: LayoutGrid },
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/messages", label: "Messages", icon: MessageSquare, badge: true },
  { href: "/rewards", label: "Rewards", icon: Gift, rewards: true },
];

export function AppNav() {
  const pathname = usePathname();
  const unreadCount = useMessageBadgeCount();

  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me", { credentials: "same-origin" });
      if (res.status === 401 || !res.ok) return null;
      const json = await res.json();
      return json.data as { isVendor: boolean; role: string } | null;
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  const { data: rewards } = useQuery({
    queryKey: ["rewards-wallet"],
    queryFn: async () => {
      const res = await fetch("/api/rewards/wallet", { credentials: "same-origin" });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as { availableBalance: number };
    },
    enabled: me != null,
    staleTime: 60_000,
    retry: false,
  });

  const navLinks: NavLink[] = me
    ? [
        ...authLinks,
        me.isVendor
          ? { href: "/vendor", label: "My business", icon: Store }
          : { href: "/onboarding/vendor", label: "List your business", icon: Store },
      ]
    : guestLinks;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">
        <BrandLogo heightClass="h-[68px]" />
        <nav className="hidden items-center gap-6 md:flex">
          <CategoriesDesktopDropdown label="Categories" />
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex items-center gap-1.5 text-sm",
                pathname.startsWith(l.href.split("#")[0])
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="relative inline-flex">
                <l.icon className="h-4 w-4" />
                {l.badge && (
                  <MessageNotificationBadge
                    count={unreadCount}
                    className="-right-2.5 -top-2"
                  />
                )}
                {l.rewards && (rewards?.availableBalance ?? 0) > 0 && (
                  <span className="absolute -right-6 -top-2 whitespace-nowrap rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {formatCurrency(rewards!.availableBalance)}
                  </span>
                )}
              </span>
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
