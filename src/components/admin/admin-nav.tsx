"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Building2,
  Store,
  Users,
  BadgeCheck,
  Shield,
  Wallet,
  Gift,
  MessageSquare,
  BarChart3,
  ScrollText,
  GitCompareArrows,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMessageBadgeCount, MessageNotificationBadge } from "@/components/messages/message-notification-badge";
import type { AdminSection } from "@/lib/admin-permissions";
import { useAdminSessionGuard } from "@/components/admin/use-admin-me";
import { BrandLogo } from "@/components/brand-logo";

export const ADMIN_NAV: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  section: AdminSection;
  badge?: boolean;
}[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, section: "dashboard" },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays, section: "bookings" },
  { href: "/admin/listings", label: "Venues", icon: Building2, section: "listings" },
  { href: "/admin/vendors", label: "Vendors", icon: Store, section: "vendors" },
  { href: "/admin/users", label: "Customers", icon: Users, section: "users" },
  { href: "/admin/verification", label: "Verification", icon: BadgeCheck, section: "verification" },
  { href: "/admin/trust", label: "Trust & Safety", icon: Shield, section: "trust" },
  { href: "/admin/escrow", label: "Escrow & Payments", icon: Wallet, section: "escrow" },
  { href: "/admin/reconciliation", label: "Reconciliation", icon: GitCompareArrows, section: "reconciliation" },
  { href: "/admin/rewards", label: "Rewards", icon: Gift, section: "rewards" },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare, section: "messages", badge: true },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, section: "analytics" },
  { href: "/admin/audit", label: "Audit Logs", icon: ScrollText, section: "audit" },
  { href: "/admin/team", label: "Team & Roles", icon: UserCog, section: "roles" },
];

export function AdminSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const unread = useMessageBadgeCount();
  const { adminMe, allowedSections } = useAdminSessionGuard();
  const showMessageBadge = allowedSections.has("messages");
  const navItems = ADMIN_NAV.filter((item) => allowedSections.has(item.section));

  return (
    <aside
      className={cn(
        "hidden w-56 shrink-0 flex-col border-r border-white/10 bg-[#1a1215] lg:flex",
        className
      )}
    >
      <div className="border-b border-white/10 px-5 py-5">
        <BrandLogo href="/admin" heightClass="h-[68px]" />
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7A2E3D]">
          Control Center
        </p>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-[#7A2E3D]/30 text-[#E5DFD9] shadow-[inset_0_0_0_1px_rgba(122,46,61,0.4)]"
                  : "text-[#E5DFD9]/60 hover:bg-white/5 hover:text-[#E5DFD9]"
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", active && "text-[#E5DFD9]")} />
              <span className="truncate">{item.label}</span>
              {item.badge && showMessageBadge && unread > 0 && (
                <MessageNotificationBadge count={unread} className="ml-auto -right-0 top-0" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link
          href="/marketplace"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-[#E5DFD9]/50 hover:text-[#E5DFD9]"
        >
          ← Back to marketplace
        </Link>
      </div>
    </aside>
  );
}

export function AdminMobileNav() {
  const pathname = usePathname();
  const { allowedSections } = useAdminSessionGuard();

  const mobile = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, section: "dashboard" as AdminSection },
    { href: "/admin/bookings", label: "Bookings", icon: CalendarDays, section: "bookings" as AdminSection },
    { href: "/admin/trust", label: "Trust", icon: Shield, section: "trust" as AdminSection },
    { href: "/admin/users", label: "Users", icon: Users, section: "users" as AdminSection },
    { href: "/admin/analytics", label: "More", icon: BarChart3, section: "analytics" as AdminSection },
  ].filter((item) => allowedSections.has(item.section));

  if (mobile.length === 0) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-[#7A2E3D]/20 bg-[#1a1215]/95 backdrop-blur-md lg:hidden">
      {mobile.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium",
              active ? "text-[#E5DFD9]" : "text-[#E5DFD9]/45"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
            {active && (
              <span className="absolute top-0 h-0.5 w-10 rounded-b bg-[#7A2E3D]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminTopbar() {
  const { adminMe } = useAdminSessionGuard();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#1a1215]/80 px-4 backdrop-blur-md lg:px-6">
      <div className="lg:hidden">
        <BrandLogo href="/admin" variant="icon" heightClass="h-14" />
      </div>
      <div className="hidden text-sm text-[#E5DFD9]/50 lg:block">
        Mission control for the Evendor marketplace
      </div>
      <div className="flex items-center gap-2">
        <div className="flex h-9 items-center gap-2 rounded-xl border border-[#7A2E3D]/30 bg-[#7A2E3D]/10 px-3">
          <Shield className="h-3.5 w-3.5 text-[#E5DFD9]" />
          <span className="text-xs font-medium text-[#E5DFD9]">
            {adminMe?.adminRoleLabel ?? "Admin"}
          </span>
        </div>
      </div>
    </header>
  );
}
