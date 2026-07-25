"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { format } from "date-fns";
import {
  Wallet,
  Lock,
  TrendingUp,
  BadgeCheck,
  CalendarDays,
  Star,
  AlertTriangle,
  Plus,
  Image,
  Users,
  Banknote,
  Crown,
  UserPlus,
  PenLine,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { parseApiResponse } from "@/lib/parse-api-response";
import { Button } from "@/components/ui/button";
import {
  VendorSummaryCard,
  QuickActionGrid,
  VendorSection,
  VendorSkeleton,
  BOOKING_STATUS_STYLES,
} from "@/components/vendor/vendor-ui";
import { useVendorSubscription } from "@/hooks/use-vendor-subscription";

type OverviewData = {
  availableBalance: number;
  pendingEarnings: number;
  escrowBalance?: number;
  monthEarnings: number;
  subscriptionTier?: string;
  isPremium?: boolean;
  verificationStatus: string;
  verified: boolean;
  pendingRequests: number;
  unreadMessages: number;
  unreadNotifications: number;
  openDisputes: number;
  ratingAvg: number;
  reviewCount: number;
  revenueGrowth: number | null;
  todaysJobs: {
    id: string;
    customerName: string | null;
    listingTitle: string;
    eventDate: string;
    startTime?: string;
    status: string;
    totalAmount: number;
  }[];
  upcomingEvents: {
    id: string;
    customerName: string | null;
    listingTitle: string;
    eventDate: string;
    status: string;
  }[];
  recentReviews: {
    id: string;
    rating: number;
    comment: string | null;
    customerName: string | null;
    createdAt: string;
  }[];
  recentBookings: {
    id: string;
    customerName: string | null;
    listingTitle: string;
    eventDate: string;
    totalAmount: number;
    status: string;
  }[];
};

export function VendorOverview({ businessName }: { businessName: string }) {
  const { data: sub } = useVendorSubscription();
  const { data, isLoading } = useQuery({
    queryKey: ["vendor-overview"],
    queryFn: async () => {
      const res = await fetch("/api/vendor/overview");
      const parsed = await parseApiResponse<OverviewData>(res);
      if (!parsed.ok) throw new Error(parsed.message);
      return parsed.data;
    },
    refetchInterval: 60_000,
  });

  if (isLoading || !data) return <VendorSkeleton rows={2} />;

  const isVerified = data.verified || data.verificationStatus === "VERIFIED";
  const showVerifyCta = !isVerified;

  const isPremium = sub?.isPremium ?? data?.isPremium ?? false;

  const quickActions = [
    ...(isPremium
      ? [{ label: "Manual Booking", href: "/vendor/manual-booking", icon: PenLine, highlight: true }]
      : [{ label: "Manual Booking", href: "/vendor/manual-booking", icon: PenLine }]),
    { label: "Customers", href: "/vendor/crm", icon: UserPlus },
    { label: "Revenue", href: "/vendor/revenue", icon: TrendingUp },
    { label: "View Bookings", href: "/vendor/bookings", icon: Users },
    { label: "Manage Calendar", href: "/vendor/calendar", icon: CalendarDays },
    { label: "Create Service", href: "/vendor/services", icon: Plus },
    { label: "Update Portfolio", href: "/vendor/portfolio", icon: Image },
    { label: "Withdraw Funds", href: "/vendor/payouts", icon: Banknote },
    ...(showVerifyCta
      ? [{ label: "Get Verified", href: "/vendor/verification", icon: BadgeCheck, highlight: true }]
      : []),
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">{businessName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your business command center — earnings, bookings, and clients at a glance.
          </p>
        </div>
        {showVerifyCta && (
          <Link href="/vendor/verification">
            <Button variant="gradient" size="sm" className="gap-2 shrink-0">
              <BadgeCheck className="h-4 w-4" /> Get Verified
            </Button>
          </Link>
        )}
        {!isPremium && (
          <Link href="/vendor/subscription">
            <Button variant="outline" size="sm" className="gap-2 shrink-0">
              <Crown className="h-4 w-4 text-primary" /> Upgrade to Premium
            </Button>
          </Link>
        )}
      </div>

      {!isPremium && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <span className="font-semibold text-primary">Free plan</span> — marketplace bookings, calendar,
          and payouts.{" "}
          <Link href="/vendor/subscription" className="font-medium text-primary underline">
            Upgrade
          </Link>{" "}
          for manual bookings, CRM, staff, analytics & exports.
        </div>
      )}

      {/* Top summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <VendorSummaryCard
          label="Available Balance"
          value={formatCurrency(data.availableBalance)}
          sub="Ready to withdraw"
          href="/vendor/payouts"
          accent
          icon={Wallet}
        />
        <VendorSummaryCard
          label="Escrow Balance"
          value={formatCurrency(data.escrowBalance ?? data.pendingEarnings)}
          sub="Funds protected"
          href="/vendor/payouts"
          icon={Lock}
        />
        <VendorSummaryCard
          label="This Month Earnings"
          value={formatCurrency(data.monthEarnings)}
          sub={
            data.revenueGrowth !== null
              ? `${data.revenueGrowth >= 0 ? "+" : ""}${data.revenueGrowth}% vs last month`
              : "Current month"
          }
          href="/vendor/revenue"
          icon={TrendingUp}
        />
        <VendorSummaryCard
          label="Subscription"
          value={isPremium ? "Premium" : "Free"}
          sub={isPremium ? "BOS features unlocked" : "Upgrade for full BOS"}
          href="/vendor/subscription"
          accent={isPremium}
          icon={Crown}
        />
      </div>

      {/* Quick actions */}
      <div>
        <p className="mb-3 text-sm font-semibold text-muted-foreground">Quick Actions</p>
        <QuickActionGrid actions={quickActions} />
      </div>

      {/* Today's overview */}
      <div className="grid gap-4 lg:grid-cols-2">
        <VendorSection title="Today's Jobs" href="/vendor/bookings?filter=today" hrefLabel="View all">
          {data.todaysJobs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No jobs scheduled for today.</p>
          ) : (
            <div className="space-y-3">
              {data.todaysJobs.map((j) => (
                <Link
                  key={j.id}
                  href={`/vendor/bookings?highlight=${j.id}`}
                  className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-muted/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    {(j.customerName ?? "?").charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{j.customerName ?? "Customer"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {j.listingTitle}
                      {j.startTime ? ` · ${format(new Date(j.startTime), "h:mm a")}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${BOOKING_STATUS_STYLES[j.status] ?? "bg-muted"}`}
                  >
                    {j.status.replace("_", " ")}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </VendorSection>

        <VendorSection title="Upcoming Events" href="/vendor/bookings?filter=upcoming">
          {data.upcomingEvents.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No upcoming events.</p>
          ) : (
            <div className="space-y-3">
              {data.upcomingEvents.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-xl p-2 hover:bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{e.customerName ?? "Customer"}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(e.eventDate), "EEE, MMM d")} · {e.listingTitle}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${BOOKING_STATUS_STYLES[e.status] ?? "bg-muted"}`}
                  >
                    {e.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </VendorSection>
      </div>

      {/* Activity row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/vendor/bookings?filter=pending"
          className="rounded-2xl border border-border/80 bg-card/60 p-4 backdrop-blur-sm transition hover:border-primary/30"
        >
          <p className="text-2xl font-bold text-primary">{data.pendingRequests}</p>
          <p className="text-sm text-muted-foreground">Pending Booking Requests</p>
        </Link>
        <Link
          href="/messages"
          className="rounded-2xl border border-border/80 bg-card/60 p-4 backdrop-blur-sm transition hover:border-primary/30"
        >
          <p className="text-2xl font-bold">{data.unreadMessages}</p>
          <p className="text-sm text-muted-foreground">Unread Messages</p>
        </Link>
        <Link
          href="/vendor/reviews"
          className="rounded-2xl border border-border/80 bg-card/60 p-4 backdrop-blur-sm transition hover:border-primary/30"
        >
          <p className="text-2xl font-bold flex items-center gap-1">
            {data.ratingAvg > 0 ? data.ratingAvg.toFixed(1) : "—"}
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          </p>
          <p className="text-sm text-muted-foreground">{data.reviewCount} Reviews</p>
        </Link>
        <Link
          href="/vendor/notifications"
          className="rounded-2xl border border-border/80 bg-card/60 p-4 backdrop-blur-sm transition hover:border-primary/30"
        >
          <p className="text-2xl font-bold">{data.unreadNotifications}</p>
          <p className="text-sm text-muted-foreground">Notifications</p>
        </Link>
      </div>

      {data.openDisputes > 0 && (
        <Link
          href="/vendor/disputes"
          className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{data.openDisputes} open dispute(s)</p>
            <p className="text-sm opacity-80">Review and respond in the Dispute Center</p>
          </div>
        </Link>
      )}

      {/* Recent reviews + bookings */}
      <div className="grid gap-4 lg:grid-cols-2">
        {data.recentReviews.length > 0 && (
          <VendorSection title="Recent Reviews" href="/vendor/reviews">
            <div className="space-y-3">
              {data.recentReviews.map((r) => (
                <div key={r.id} className="rounded-xl border border-border/60 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{r.customerName ?? "Customer"}</p>
                    <span className="text-amber-500">{"★".repeat(r.rating)}</span>
                  </div>
                  {r.comment && (
                    <p className="mt-1 line-clamp-2 text-muted-foreground">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </VendorSection>
        )}

        {data.recentBookings.length > 0 && (
          <VendorSection title="Recent Bookings" href="/vendor/bookings">
            <div className="space-y-3">
              {data.recentBookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-xl p-2 hover:bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{b.customerName ?? "Customer"}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.listingTitle} · {format(new Date(b.eventDate), "MMM d")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">{formatCurrency(b.totalAmount)}</p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${BOOKING_STATUS_STYLES[b.status] ?? "bg-muted"}`}
                    >
                      {b.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </VendorSection>
        )}
      </div>
    </div>
  );
}
