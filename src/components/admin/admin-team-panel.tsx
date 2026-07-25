"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Shield, UserPlus, UserMinus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import {
  ADMIN_ROLE_DESCRIPTIONS,
  ADMIN_ROLE_LABELS,
} from "@/lib/admin-permissions";
import { reportClientError } from "@/lib/client-error";
import type { AdminRole } from "@prisma/client";
import { useAdminMe } from "@/components/admin/use-admin-me";

type AdminUserRow = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  adminRole: AdminRole | null;
  createdAt: string;
};

type LookupUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  adminRole: AdminRole | null;
};

const ADMIN_ROLES: AdminRole[] = ["SUPER_ADMIN", "FINANCE", "SUPPORT", "MODERATOR"];

export function AdminTeamPanel() {
  const qc = useQueryClient();
  const [lookupEmail, setLookupEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<AdminRole>("SUPPORT");
  const [lookupResult, setLookupResult] = useState<LookupUser | null>(null);
  const [lookupError, setLookupError] = useState(false);

  const { adminMe } = useAdminMe();

  const { data: admins, isLoading } = useQuery({
    queryKey: ["admin-team"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users?role=ADMIN");
      if (!res.ok) throw new Error("Failed to load team");
      return (await res.json()).data as AdminUserRow[];
    },
    enabled: adminMe?.isSuperAdmin === true,
  });

  const patchAdmin = useMutation({
    mutationFn: async (input: {
      userId: string;
      adminRole?: AdminRole | null;
      promoteToAdmin?: boolean;
      revokeAdminAccess?: boolean;
    }) => {
      const body = input.revokeAdminAccess
        ? { revokeAdminAccess: true }
        : {
            adminRole: input.adminRole ?? "SUPER_ADMIN",
            ...(input.promoteToAdmin ? { promoteToAdmin: true } : {}),
          };

      const res = await fetch(`/api/admin/users/${input.userId}/admin-role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Request failed");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-team"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setLookupResult(null);
      setLookupEmail("");
    },
    onError: (err) => reportClientError("admin-team", err),
  });

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupError(false);
    setLookupResult(null);
    const email = lookupEmail.trim();
    if (!email) return;

    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(email)}`);
      const json = await res.json();
      if (!res.ok) {
        setLookupError(true);
        return;
      }
      const users = json.data as LookupUser[];
      const match =
        users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? users[0] ?? null;
      if (!match) setLookupError(true);
      else setLookupResult(match);
    } catch (err) {
      reportClientError("admin-team-lookup", err);
      setLookupError(true);
    }
  }

  if (adminMe && !adminMe.isSuperAdmin) {
    return (
      <div className="space-y-4">
        <AdminPageHeader
          title="Team & Roles"
          subtitle="Only super admins can manage admin access."
        />
        <p className="text-sm text-[#E5DFD9]/50">
          Contact a super admin to change team permissions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Team & Roles"
        subtitle="Promote users to admin and assign Finance, Support, or Moderator permissions."
      />

      <div className="rounded-2xl border border-[#7A2E3D]/20 bg-[#7A2E3D]/5 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#E5DFD9]">
          <Shield className="h-4 w-4" /> Role permissions
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {ADMIN_ROLES.map((r) => (
            <div key={r} className="text-xs text-[#E5DFD9]/60">
              <span className="font-medium text-[#E5DFD9]">{ADMIN_ROLE_LABELS[r]}:</span>{" "}
              {ADMIN_ROLE_DESCRIPTIONS[r]}
            </div>
          ))}
        </div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-[#7A2E3D]" />
          <h2 className="text-sm font-semibold text-[#E5DFD9]">Add admin team member</h2>
        </div>
        <p className="mb-4 text-xs text-[#E5DFD9]/45">
          The user must already have an Evendor account (customer or vendor). Promoting changes
          their platform role to Admin.
        </p>
        <form onSubmit={(e) => void handleLookup(e)} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#E5DFD9]/30" />
            <input
              type="email"
              required
              className="w-full rounded-xl border border-white/10 bg-[#0f0b0d] py-2.5 pl-10 pr-4 text-sm text-[#E5DFD9] placeholder:text-[#E5DFD9]/30 focus:outline-none focus:ring-2 focus:ring-[#7A2E3D]/50"
              placeholder="Search by email…"
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-[#7A2E3D]/30 px-4 py-2.5 text-sm font-medium text-[#E5DFD9] hover:bg-[#7A2E3D]/40"
          >
            Find user
          </button>
        </form>

        {lookupError && (
          <p className="mt-3 text-xs text-[#E5DFD9]/45">No user found with that email.</p>
        )}

        {lookupResult && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[#E5DFD9]">{lookupResult.fullName ?? lookupResult.email}</p>
              <p className="text-xs text-[#E5DFD9]/45">{lookupResult.email}</p>
              <p className="text-xs text-[#E5DFD9]/40">Current role: {lookupResult.role}</p>
            </div>
            {lookupResult.role === "ADMIN" ? (
              <p className="text-xs text-emerald-400/80">Already an admin — adjust role below.</p>
            ) : (
              <>
                <select
                  className="rounded-lg border border-white/10 bg-[#0f0b0d] px-3 py-2 text-xs text-[#E5DFD9]"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as AdminRole)}
                >
                  {ADMIN_ROLES.filter((r) => r !== "SUPER_ADMIN").map((r) => (
                    <option key={r} value={r}>
                      {ADMIN_ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={patchAdmin.isPending}
                  onClick={() =>
                    patchAdmin.mutate({
                      userId: lookupResult.id,
                      adminRole: selectedRole,
                      promoteToAdmin: true,
                    })
                  }
                  className="rounded-lg bg-[#7A2E3D] px-4 py-2 text-xs font-medium text-white hover:bg-[#7A2E3D]/90 disabled:opacity-50"
                >
                  Promote to admin
                </button>
              </>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[#E5DFD9]">Current admin team</h2>
        {isLoading && <div className="h-32 animate-pulse rounded-2xl bg-white/5" />}
        {(admins ?? []).map((u) => (
          <div
            key={u.id}
            className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-[#1a1215]/60 p-4"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7A2E3D]/20 font-bold text-[#E5DFD9]">
              {(u.fullName ?? u.email).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[#E5DFD9]">{u.fullName ?? u.email}</p>
              <p className="text-xs text-[#E5DFD9]/40">{u.email}</p>
            </div>
            <select
              className="rounded-lg border border-white/10 bg-[#0f0b0d] px-3 py-2 text-xs text-[#E5DFD9]"
              value={u.adminRole ?? "SUPER_ADMIN"}
              disabled={patchAdmin.isPending}
              onChange={(e) => {
                patchAdmin.mutate({
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
            <button
              type="button"
              title="Revoke admin access"
              disabled={patchAdmin.isPending}
              onClick={() => {
                if (!window.confirm(`Remove admin access for ${u.email}?`)) return;
                patchAdmin.mutate({ userId: u.id, revokeAdminAccess: true });
              }}
              className="flex items-center gap-1 rounded-lg border border-red-500/20 px-3 py-2 text-xs text-red-400/80 hover:bg-red-500/10 disabled:opacity-50"
            >
              <UserMinus className="h-3.5 w-3.5" />
              Revoke
            </button>
          </div>
        ))}
        {!isLoading && !admins?.length && (
          <p className="py-8 text-center text-sm text-[#E5DFD9]/40">No admin users yet.</p>
        )}
      </section>

      <p className="text-xs text-[#E5DFD9]/40">
        For customer and vendor lookup (non-admin), see{" "}
        <Link href="/admin/users" className="text-[#7A2E3D] hover:underline">
          Customers
        </Link>
        .
      </p>
    </div>
  );
}
