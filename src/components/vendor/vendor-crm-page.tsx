"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Crown, Search, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { parseApiResponse } from "@/lib/parse-api-response";
import { VendorPageHeader, VendorSection, VendorSkeleton } from "@/components/vendor/vendor-ui";
import { PremiumUpgradeModal } from "@/components/vendor/premium-upgrade-modal";
import { useVendorSubscription } from "@/hooks/use-vendor-subscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CrmCustomer = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  totalSpend: number;
  lastBookingAt: string | null;
  _count: { bookings: number };
};

export function VendorCrmPage() {
  const { data: sub } = useVendorSubscription();
  const [q, setQ] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const isPremium = sub?.isPremium ?? false;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["vendor-crm", q],
    queryFn: async () => {
      const res = await fetch(`/api/vendor/crm?q=${encodeURIComponent(q)}`, {
        credentials: "same-origin",
      });
      if (res.status === 402) {
        setUpgradeOpen(true);
        throw new Error("Premium required");
      }
      const parsed = await parseApiResponse<CrmCustomer[]>(res);
      if (!parsed.ok) throw new Error(parsed.message);
      return parsed.data;
    },
    enabled: isPremium,
  });

  if (!isPremium) {
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="Customer CRM"
          subtitle="Track offline and repeat clients — spend, history, and notes."
        />
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-6 py-12 text-center">
          <Users className="h-10 w-10 text-primary" />
          <p className="max-w-md text-sm text-muted-foreground">
            Premium unlocks your customer database. Every manual booking automatically creates a
            profile here.
          </p>
          <Button variant="gradient" className="gap-2" onClick={() => setUpgradeOpen(true)}>
            <Crown className="h-4 w-4" /> Upgrade to Premium
          </Button>
        </div>
        <PremiumUpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} feature="crm" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <VendorPageHeader
        title="Customer CRM"
        subtitle="Search customers, view spend, and booking history."
      />
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search name, phone, email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {isLoading && <VendorSkeleton rows={4} />}
      {!isLoading && (
        <VendorSection title={`${data?.length ?? 0} customers`}>
          <div className="divide-y divide-border rounded-xl border border-border">
            {(data ?? []).map((c) => (
              <Link
                key={c.id}
                href={`/vendor/crm/${c.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-muted/40"
              >
                <div>
                  <p className="font-medium">{c.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.phone}
                    {c.email ? ` · ${c.email}` : ""}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold">{formatCurrency(c.totalSpend)}</p>
                  <p className="text-xs text-muted-foreground">{c._count.bookings} bookings</p>
                </div>
              </Link>
            ))}
            {(data ?? []).length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No customers yet. Create a manual booking to add your first CRM profile.
              </p>
            )}
          </div>
        </VendorSection>
      )}
      {isError && error?.message !== "Premium required" && (
        <p className="text-sm text-destructive">{error.message}</p>
      )}
    </div>
  );
}
