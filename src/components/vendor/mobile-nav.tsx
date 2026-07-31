"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  CalendarDays,
  Users,
  MessageSquare,
  UserCircle,
  MoreHorizontal,
  Banknote,
  BarChart3,
  Wallet,
  Settings,
} from "lucide-react";
import { useMessageBadgeCount } from "@/components/messages/message-notification-badge";

const PRIMARY = [
  { href: "/vendor", label: "Home", icon: Home, exact: true },
  { href: "/vendor/bookings", label: "Bookings", icon: Users },
  { href: "/vendor/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/messages", label: "Messages", icon: MessageSquare, badge: true },
];

const MORE_LINKS = [
  { href: "/vendor/revenue", label: "Revenue", icon: Banknote },
  { href: "/vendor/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/vendor/payouts", label: "Payouts", icon: Wallet },
  { href: "/vendor/services", label: "Services", icon: Settings },
  { href: "/vendor/leads", label: "Leads", icon: Users },
  { href: "/vendor/disputes", label: "Disputes", icon: Settings },
  { href: "/vendor/subscription", label: "Subscription", icon: Settings },
  { href: "/vendor/profile", label: "Business profile", icon: UserCircle },
  { href: "/account", label: "Edit profile", icon: Settings },
];

export function VendorMobileNav({ verified }: { verified?: boolean }) {
  const pathname = usePathname();
  const unread = useMessageBadgeCount();
  const [moreOpen, setMoreOpen] = useState(false);

  const moreActive = MORE_LINKS.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-background/95 backdrop-blur-md lg:hidden">
        {!verified && (
          <Link
            href="/vendor/verification"
            className="flex items-center justify-center gap-2 border-b border-primary/20 bg-primary/5 py-2 text-xs font-semibold text-primary"
          >
            Get Verified — unlock trust badge & priority ranking
          </Link>
        )}
        <div className="flex">
          {PRIMARY.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                ].join(" ")}
              >
                <span className="relative">
                  <item.icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
                  {item.badge && unread > 0 && (
                    <span className="absolute -right-1.5 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </span>
                {item.label}
                {active && (
                  <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-b-full bg-primary" />
                )}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={[
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
              moreActive || moreOpen ? "text-primary" : "text-muted-foreground",
            ].join(" ")}
          >
            <MoreHorizontal className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-16 left-3 right-3 rounded-2xl border border-border bg-card p-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              More
            </p>
            <div className="grid grid-cols-2 gap-1">
              {MORE_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm hover:bg-muted"
                >
                  <item.icon className="h-4 w-4 text-primary" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
