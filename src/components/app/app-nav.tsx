"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { Heart, LayoutGrid, MessageSquare, User, Store, Gift, type LucideIcon } from "lucide-react";
import { useMessageBadgeCount, MessageNotificationBadge } from "@/components/messages/message-notification-badge";
import { BrandLogo } from "@/components/brand-logo";

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: boolean;
  rewards?: boolean;
};

const baseLinks: NavLink[] = [
  { href: "/marketplace", label: "Marketplace", icon: LayoutGrid },
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/messages", label: "Messages", icon: MessageSquare, badge: true },
  { href: "/dashboard", label: "Dashboard", icon: User },
  { href: "/rewards", label: "Rewards", icon: Gift, rewards: true },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const unreadCount = useMessageBadgeCount();

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me", { credentials: "same-origin" });
      if (!res.ok) return null;
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

  const vendorLink: NavLink = me?.isVendor
    ? { href: "/vendor", label: "My business", icon: Store }
    : { href: "/onboarding/vendor", label: "List your business", icon: Store };

  const navLinks: NavLink[] = [...baseLinks, vendorLink];

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">
        <BrandLogo heightClass="h-[68px]" />
        <nav className="hidden gap-6 md:flex">
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
        <Button variant="ghost" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
