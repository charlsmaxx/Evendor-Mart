"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  Calendar,
  FileText,
  MessageSquare,
  Store,
  ArrowRight,
  LayoutGrid,
  Briefcase,
  Gift,
} from "lucide-react";
import { MessageNotificationBadge, useMessageBadgeCount } from "@/components/messages/message-notification-badge";
import { RewardsWalletView, type RewardsWalletData } from "@/components/rewards/rewards-wallet-view";

export type DashboardUser = {
  id: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  role: string;
};

export type VendorStats = {
  views: number;
  leads: number;
  bookings: number;
  businessName: string;
};

export function UnifiedDashboard({
  user,
  isVendor,
  vendorStats,
}: {
  user: DashboardUser;
  isVendor: boolean;
  vendorStats: VendorStats | null;
}) {
  const displayName = user.fullName ?? user.email.split("@")[0];
  const initials = displayName.charAt(0).toUpperCase();
  const unreadCount = useMessageBadgeCount();

  const bookings = useQuery({
    queryKey: ["my-bookings"],
    queryFn: async () => {
      const res = await fetch("/api/bookings?limit=5");
      const json = await res.json();
      return { items: (json.data ?? []) as Array<{
        id: string;
        status: string;
        listing: { title: string };
        totalAmount: number;
      }>, hasMore: Boolean(json.meta?.hasMore) };
    },
  });

  const quotes = useQuery({
    queryKey: ["my-quotes"],
    queryFn: async () => (await fetch("/api/quotes")).json().then((j) => j.data ?? []),
  });

  const rewards = useQuery({
    queryKey: ["rewards-wallet"],
    queryFn: async () => {
      const res = await fetch("/api/rewards/wallet");
      const json = await res.json();
      if (!res.ok) return null;
      return json.data as RewardsWalletData;
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <section className="flex flex-col items-center text-center">
        <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-primary/20 bg-primary/10 shadow-sm">
          {user.avatarUrl ? (
            <Image src={user.avatarUrl} alt={displayName} fill className="object-cover" sizes="96px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-primary">
              {initials}
            </div>
          )}
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">{displayName}</h1>
        <p className="text-sm text-muted-foreground">Your Evendor dashboard</p>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-semibold">Bookings</h2>
        </div>
        {(bookings.data?.items ?? []).length > 0 ? (
          <div className="space-y-3">
            {(bookings.data?.items ?? []).map((b) => (
              <Link
                key={b.id}
                href={`/bookings/${b.id}`}
                className="block rounded-xl border border-border bg-card p-4 transition hover:shadow-md"
              >
                <p className="font-medium">{b.listing?.title}</p>
                <p className="text-sm text-muted-foreground">
                  {b.status} · {formatCurrency(b.totalAmount)}
                </p>
              </Link>
            ))}
            {bookings.data?.hasMore && isVendor && (
              <Link
                href="/vendor/bookings"
                className="block text-center text-sm font-medium text-primary hover:underline"
              >
                View all bookings
              </Link>
            )}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-10 text-center">
              <Calendar className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium">No bookings yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Discover venues and vendors, then book your first event in minutes.
              </p>
              <Button variant="gradient" className="mt-5" asChild>
                <Link href="/marketplace">
                  Make your first book <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-semibold">Messages</h2>
          </div>
          <Link href="/messages" className="relative inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            Open inbox
            <MessageNotificationBadge count={unreadCount} className="-right-4 -top-2" />
          </Link>
        </div>
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">
              Chat with vendors about quotes, availability, and event details.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/messages">View messages</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-semibold">Rewards</h2>
          </div>
          {rewards.data && rewards.data.availableBalance > 0 && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              {formatCurrency(rewards.data.availableBalance)}
            </span>
          )}
        </div>
        {rewards.data ? (
          <RewardsWalletView data={rewards.data} compact />
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <Gift className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Earn 2% cashback on every completed booking.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/rewards">View rewards wallet</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-semibold">Quotes</h2>
        </div>
        {(quotes.data ?? []).length > 0 ? (
          <div className="space-y-3">
            {(quotes.data ?? []).map(
              (q: { id: string; status: string; vendor: { businessName: string } }) => (
                <div key={q.id} className="rounded-xl border border-border bg-card p-4">
                  <p className="font-medium">{q.vendor?.businessName}</p>
                  <p className="text-sm text-muted-foreground">{q.status}</p>
                </div>
              )
            )}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Request quotes from vendors on their profile pages — they&apos;ll appear here.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/marketplace">Browse marketplace</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {isVendor && vendorStats && (
        <section id="vendor-overview" className="scroll-mt-8 border-t border-border pt-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-semibold">Vendor overview</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{vendorStats.businessName}</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/vendor">
                Vendor dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Profile views", value: vendorStats.views },
              { label: "Quote leads", value: vendorStats.leads },
              { label: "Bookings", value: vendorStats.bookings },
            ].map((s) => (
              <Card key={s.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/vendor/listings", label: "Listings", icon: LayoutGrid },
              { href: "/vendor/leads", label: "Leads", icon: FileText },
              { href: "/vendor/bookings", label: "Vendor bookings", icon: Calendar },
              { href: "/vendor/portfolio", label: "Portfolio", icon: Store },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition hover:bg-muted/50"
              >
                <link.icon className="h-4 w-4 text-primary" />
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
