"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, BadgeCheck, Shield } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import {
  ADMIN_ROLE_DESCRIPTIONS,
  ADMIN_ROLE_LABELS,
} from "@/lib/admin-permissions";
import type { AdminRole } from "@prisma/client";
import { useAdminMe } from "@/components/admin/use-admin-me";

type UserRow = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  adminRole: AdminRole | null;
  phone: string | null;
  createdAt: string;
  vendorProfile: {
    businessName: string;
    verified: boolean;
    verificationStatus: string;
    ratingAvg: number;
    cancellationRate: number | null;
    disputeRate: number | null;
  } | null;
  _count: { bookings: number; reviews: number };
  rewardsWallet: { availableBalance: number; totalEarned: number } | null;
};

const ROLES = ["all", "CUSTOMER", "VENDOR", "ADMIN"] as const;
const ADMIN_ROLES: AdminRole[] = ["SUPER_ADMIN", "FINANCE", "SUPPORT", "MODERATOR"];

export function AdminUsersPanel() {
  const qc = useQueryClient();
  const [role, setRole] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { adminMe } = useAdminMe();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", role, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (role !== "all") params.set("role", role);
      if (search) params.set("q", search);
      const res = await fetch(`/api/admin/users?${params}`);
      return (await res.json()).data as UserRow[];
    },
  });

  const updateAdminRole = useMutation({
    mutationFn: async ({ userId, adminRole }: { userId: string; adminRole: AdminRole }) => {
      const res = await fetch(`/api/admin/users/${userId}/admin-role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to update role");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        subtitle="Customers, vendors, and platform accounts — searchable and filterable."
      />

      {adminMe?.isSuperAdmin && (
        <div className="rounded-2xl border border-[#7A2E3D]/20 bg-[#7A2E3D]/5 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#E5DFD9]">
              <Shield className="h-4 w-4" /> Admin roles
            </div>
            <Link
              href="/admin/team"
              className="text-xs font-medium text-[#7A2E3D] hover:underline"
            >
              Manage team & roles →
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(ADMIN_ROLE_LABELS) as AdminRole[]).map((r) => (
              <div key={r} className="text-xs text-[#E5DFD9]/60">
                <span className="font-medium text-[#E5DFD9]">{ADMIN_ROLE_LABELS[r]}:</span>{" "}
                {ADMIN_ROLE_DESCRIPTIONS[r]}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#E5DFD9]/30" />
          <input
            className="w-full rounded-xl border border-white/10 bg-[#1a1215]/60 py-2.5 pl-10 pr-4 text-sm text-[#E5DFD9] placeholder:text-[#E5DFD9]/30 focus:outline-none focus:ring-2 focus:ring-[#7A2E3D]/50"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`rounded-lg px-3 py-2 text-xs font-medium capitalize transition ${
                role === r ? "bg-[#7A2E3D]/30 text-[#E5DFD9]" : "text-[#E5DFD9]/40 hover:bg-white/5"
              }`}
            >
              {r.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-white/5" />}

      <div className="space-y-2">
        {(data ?? []).map((u) => (
          <div
            key={u.id}
            className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-[#1a1215]/60 p-4"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7A2E3D]/20 font-bold text-[#E5DFD9]">
              {(u.fullName ?? u.email).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-[#E5DFD9]">{u.fullName ?? u.email}</p>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-[#E5DFD9]/60">
                  {u.role}
                </span>
                {u.role === "ADMIN" && u.adminRole && (
                  <span className="rounded-full bg-[#7A2E3D]/20 px-2 py-0.5 text-[10px] font-medium text-[#E5DFD9]">
                    {ADMIN_ROLE_LABELS[u.adminRole]}
                  </span>
                )}
                {u.vendorProfile?.verified && (
                  <span className="flex items-center gap-0.5 text-[10px] text-emerald-400">
                    <BadgeCheck className="h-3 w-3" /> Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-[#E5DFD9]/40">{u.email}</p>
              {u.vendorProfile && (
                <p className="text-xs text-[#E5DFD9]/40">
                  {u.vendorProfile.businessName}
                  {u.vendorProfile.cancellationRate != null && ` · Cancel: ${u.vendorProfile.cancellationRate}%`}
                  {u.vendorProfile.disputeRate != null && ` · Disputes: ${u.vendorProfile.disputeRate}%`}
                </p>
              )}
              {adminMe?.isSuperAdmin && u.role === "ADMIN" && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="text-[10px] text-[#E5DFD9]/40">Admin role</label>
                  <select
                    className="rounded-lg border border-white/10 bg-[#0f0b0d] px-2 py-1 text-xs text-[#E5DFD9]"
                    value={u.adminRole ?? "SUPER_ADMIN"}
                    disabled={updateAdminRole.isPending}
                    onChange={(e) => {
                      updateAdminRole.mutate({
                        userId: u.id,
                        adminRole: e.target.value as AdminRole,
                      });
                    }}
                  >
                    {ADMIN_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ADMIN_ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="shrink-0 text-right text-xs text-[#E5DFD9]/50">
              <p>{u._count.bookings} booking{u._count.bookings !== 1 ? "s" : ""}</p>
              {u.rewardsWallet && (
                <p className="text-[#7A2E3D]">{formatCurrency(u.rewardsWallet.availableBalance)} rewards</p>
              )}
            </div>
          </div>
        ))}
        {!isLoading && !data?.length && (
          <p className="py-12 text-center text-sm text-[#E5DFD9]/40">No users found.</p>
        )}
      </div>
    </div>
  );
}
