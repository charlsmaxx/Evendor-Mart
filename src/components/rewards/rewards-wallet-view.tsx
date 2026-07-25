"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Gift, ArrowUpRight, TrendingDown, TrendingUp, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CASHBACK_RATE, WALLET_REDEEM_RATIO } from "@/lib/rewards-utils";
import { Button } from "@/components/ui/button";

export type RewardTransaction = {
  id: string;
  amount: number;
  type: string;
  status: string;
  description: string | null;
  expiresAt: string | null;
  createdAt: string;
  bookingId: string | null;
  bookingTitle: string | null;
};

export type RewardsWalletData = {
  availableBalance: number;
  totalEarned: number;
  totalRedeemed: number;
  transactions: RewardTransaction[];
};

const TYPE_LABELS: Record<string, string> = {
  EARNED: "Earned",
  REDEEMED: "Redeemed",
  EXPIRED: "Expired",
  ADJUSTMENT: "Adjustment",
};

function isDebitTransaction(tx: RewardTransaction) {
  if (tx.type === "REDEEMED" || tx.type === "EXPIRED") return true;
  if (tx.type === "ADJUSTMENT") {
    return tx.description?.toLowerCase().includes("debit") ?? false;
  }
  return false;
}

export function RewardsWalletView({
  data,
  compact,
}: {
  data: RewardsWalletData;
  compact?: boolean;
}) {
  const recent = compact ? data.transactions.slice(0, 5) : data.transactions;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div
          className="rounded-2xl border border-primary/25 p-5"
          style={{
            background:
              "linear-gradient(135deg,rgba(122,46,61,0.08) 0%,rgba(229,223,217,0.2) 100%)",
          }}
        >
          <p className="text-sm text-muted-foreground">Available balance</p>
          <p className="mt-1 font-display text-3xl font-bold text-primary">
            {formatCurrency(data.availableBalance)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Spend {WALLET_REDEEM_RATIO * 100}% of your balance per booking
          </p>
        </div>
        <StatCard label="Total earned" value={formatCurrency(data.totalEarned)} icon={TrendingUp} />
        <StatCard label="Total redeemed" value={formatCurrency(data.totalRedeemed)} icon={TrendingDown} />
      </div>

      {!compact && (
        <div className="rounded-2xl border border-border/80 bg-muted/30 p-5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2 font-medium text-foreground">
            <Gift className="h-4 w-4 text-primary" /> How rewards work
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1">
            <li>Earn {CASHBACK_RATE * 100}% cashback when a booking is completed</li>
            <li>
              Each booking spends {WALLET_REDEEM_RATIO * 100}% of your balance, so a{" "}
              {formatCurrency(1200)} balance takes {formatCurrency(240)} off and keeps{" "}
              {formatCurrency(960)}
            </li>
            <li>Larger bookings unlock more of your balance at once</li>
            <li>Rewards expire after 12 months if unused</li>
          </ul>
        </div>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">
            {compact ? "Recent activity" : "Rewards history"}
          </h2>
          {compact && (
            <Link href="/rewards" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-12 text-center">
            <Gift className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 font-medium">No rewards yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete a booking to start earning cashback.
            </p>
            {!compact && (
              <Button variant="gradient" className="mt-4" asChild>
                <Link href="/marketplace">
                  Browse marketplace <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((tx) => (
              <div
                key={tx.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card/80 px-4 py-3"
              >
                <div>
                  <p className="font-medium">
                    {TYPE_LABELS[tx.type] ?? tx.type}{" "}
                    {tx.bookingTitle && (
                      <span className="text-muted-foreground">· {tx.bookingTitle}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(tx.createdAt), "MMM d, yyyy")}
                    {tx.description ? ` · ${tx.description}` : ""}
                  </p>
                  {tx.expiresAt && tx.type === "EARNED" && tx.status === "CONFIRMED" && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-700">
                      <Clock className="h-3 w-3" />
                      Expires {format(new Date(tx.expiresAt), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
                <p
                  className={`font-semibold ${
                    isDebitTransaction(tx) ? "text-primary" : "text-emerald-600"
                  }`}
                >
                  {isDebitTransaction(tx) ? "−" : "+"}
                  {formatCurrency(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card/80 p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}
