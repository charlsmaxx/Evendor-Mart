"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { RewardsWalletView, type RewardsWalletData } from "@/components/rewards/rewards-wallet-view";
import { Button } from "@/components/ui/button";
import { parseApiResponse } from "@/lib/parse-api-response";
import type { RewardTransactionRow } from "@/lib/rewards";

export default function RewardsPage() {
  const [extraTx, setExtraTx] = useState<RewardTransactionRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["rewards-wallet"],
    queryFn: async () => {
      const res = await fetch("/api/rewards/wallet");
      const parsed = await parseApiResponse<RewardsWalletData>(res);
      if (!parsed.ok) throw new Error(parsed.message);
      if (parsed.data.transactions.length < 20) setHasMore(false);
      return parsed.data;
    },
  });

  async function handleLoadMore() {
    const cursor = nextCursor ?? data?.transactions.at(-1)?.id;
    if (!cursor || loadingMore || !hasMore) return;

    setLoadingMore(true);
    const res = await fetch(`/api/rewards/transactions?cursor=${cursor}&limit=20`);
    const parsed = await parseApiResponse<{
      transactions: RewardTransactionRow[];
      nextCursor: string | null;
      hasMore: boolean;
    }>(res);
    setLoadingMore(false);

    if (!parsed.ok) return;
    setExtraTx((prev) => [...prev, ...parsed.data.transactions]);
    setNextCursor(parsed.data.nextCursor);
    setHasMore(parsed.data.hasMore);
  }

  const walletData: RewardsWalletData | null = data
    ? { ...data, transactions: [...data.transactions, ...extraTx] }
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Evendor Rewards</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your cashback balance, history, and expiry dates in one place.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading wallet…</p>
      ) : isError || !walletData ? (
        <div className="rounded-2xl border border-dashed py-12 text-center">
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      ) : (
        <>
          <RewardsWalletView data={walletData} />
          {hasMore && walletData.transactions.length > 0 && (
            <div className="flex justify-center">
              <Button variant="outline" disabled={loadingMore} onClick={() => void handleLoadMore()}>
                {loadingMore ? "Loading…" : "Load older transactions"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
