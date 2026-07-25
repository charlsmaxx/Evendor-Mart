"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VendorPageHeader, VendorSection, VendorSkeleton } from "@/components/vendor/vendor-ui";
import { PremiumUpgradeModal } from "@/components/vendor/premium-upgrade-modal";
import { useVendorSubscription } from "@/hooks/use-vendor-subscription";
import { parseApiResponse } from "@/lib/parse-api-response";

type StaffRow = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  acceptedAt: string | null;
};

export function VendorStaffPage() {
  const { data: sub } = useVendorSubscription();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", role: "RECEPTIONIST" });
  const queryClient = useQueryClient();
  const isPremium = sub?.isPremium ?? false;

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-staff"],
    queryFn: async () => {
      const res = await fetch("/api/vendor/staff", { credentials: "same-origin" });
      if (res.status === 402) {
        setUpgradeOpen(true);
        throw new Error("Premium required");
      }
      const parsed = await parseApiResponse<StaffRow[]>(res);
      if (!parsed.ok) throw new Error(parsed.message);
      return parsed.data;
    },
    enabled: isPremium,
  });

  const invite = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/vendor/staff", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.status === 402) {
        setUpgradeOpen(true);
        throw new Error("Premium required");
      }
      const parsed = await parseApiResponse(res);
      if (!parsed.ok) throw new Error(parsed.message);
    },
    onSuccess: () => {
      setForm({ fullName: "", email: "", role: "RECEPTIONIST" });
      void queryClient.invalidateQueries({ queryKey: ["vendor-staff"] });
    },
  });

  if (!isPremium) {
    return (
      <div className="space-y-6">
        <VendorPageHeader title="Staff Accounts" subtitle="Invite your team with role-based access." />
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-6 py-12 text-center">
          <UserPlus className="h-10 w-10 text-primary" />
          <Button variant="gradient" className="gap-2" onClick={() => setUpgradeOpen(true)}>
            <Crown className="h-4 w-4" /> Upgrade to Premium
          </Button>
        </div>
        <PremiumUpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} feature="staff" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <VendorPageHeader title="Staff Accounts" subtitle="Managers, reception, and ops — RBAC enforced server-side." />
      <VendorSection title="Invite staff">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            invite.mutate();
          }}
        >
          <div>
            <Label>Full name</Label>
            <Input className="mt-1" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" className="mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <Label>Role</Label>
            <select
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="MANAGER">Manager</option>
              <option value="RECEPTIONIST">Receptionist</option>
              <option value="ASSISTANT">Assistant</option>
              <option value="OPERATIONS">Operations</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" variant="gradient" disabled={invite.isPending}>
              Send invite
            </Button>
          </div>
        </form>
      </VendorSection>
      {isLoading && <VendorSkeleton rows={3} />}
      {!isLoading && (
        <VendorSection title="Team">
          <div className="space-y-2">
            {(data ?? []).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <div>
                  <p className="font-medium">{s.fullName}</p>
                  <p className="text-xs text-muted-foreground">{s.email}</p>
                </div>
                <span className="text-xs font-medium text-muted-foreground">{s.role.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </VendorSection>
      )}
    </div>
  );
}
