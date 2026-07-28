"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BadgeCheck,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminLegacyWrap } from "@/components/admin/admin-legacy-wrap";
import { DisputeEvidenceGallery } from "@/components/admin/dispute-evidence-gallery";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TrustData = {
  openDisputes: number;
  pendingVerifications: number;
  failedPayments: number;
  recentAuditLogs: {
    id: string;
    action: string;
    entityType: string;
    entityId?: string;
    createdAt: string;
    actor?: { fullName?: string; email: string } | null;
  }[];
  highCancellationVendors: {
    id: string;
    businessName: string;
    cancellationRate?: number;
    disputeRate?: number;
    verified: boolean;
  }[];
};

type Dispute = {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  evidence: {
    id: string;
    url: string;
    caption?: string | null;
    createdAt: string;
    uploadedBy?: { fullName?: string | null; email: string } | null;
  }[];
  booking: {
    id: string;
    totalAmount: number;
    listing: { title: string };
    customer: { fullName?: string; email: string };
    vendor: { businessName: string };
    payments: { amount: number; escrowStatus: string }[];
  };
};

type Verification = {
  id: string;
  documents: string[];
  notes?: string;
  status: string;
  createdAt: string;
  vendor: {
    id: string;
    businessName: string;
    city: string;
    user: { fullName?: string; email: string };
  };
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(n);
}

export default function AdminTrustPage() {
  const qc = useQueryClient();
  const [partialDisputeId, setPartialDisputeId] = useState<string | null>(null);
  const [partialPercent, setPartialPercent] = useState("42");

  const { data: trust } = useQuery({
    queryKey: ["admin-trust"],
    queryFn: async () => (await fetch("/api/admin/trust")).json().then((j) => j.data as TrustData),
    refetchInterval: 30_000,
  });

  const { data: disputes } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async () => (await fetch("/api/admin/disputes")).json().then((j) => j.data as Dispute[]),
  });

  const { data: verifications } = useQuery({
    queryKey: ["admin-verifications"],
    queryFn: async () => (await fetch("/api/admin/verifications")).json().then((j) => j.data as Verification[]),
  });

  const { data: fraud } = useQuery({
    queryKey: ["admin-fraud"],
    queryFn: async () => {
      const res = await fetch("/api/admin/fraud");
      const json = await res.json();
      if (!res.ok) return null;
      return json.data as {
        flags: {
          id: string;
          severity: string;
          title: string;
          description: string;
          entityType: string;
          detectedAt: string;
        }[];
        summary: { total: number; high: number; medium: number };
      };
    },
    refetchInterval: 60_000,
  });

  const resolveDispute = useMutation({
    mutationFn: async ({
      id,
      resolution,
      adminNotes,
      partialVendorPercent,
    }: {
      id: string;
      resolution: string;
      adminNotes?: string;
      partialVendorPercent?: number;
    }) => {
      const res = await fetch(`/api/admin/disputes/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution, adminNotes, partialVendorPercent }),
      });
      if (!res.ok) throw new Error("Failed to resolve dispute");
    },
    onSuccess: () => {
      setPartialDisputeId(null);
      qc.invalidateQueries({ queryKey: ["admin-disputes"] });
      qc.invalidateQueries({ queryKey: ["admin-trust"] });
    },
  });

  const reviewVerification = useMutation({
    mutationFn: async ({ id, action, adminNotes }: { id: string; action: string; adminNotes?: string }) => {
      const res = await fetch(`/api/admin/verifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminNotes }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-verifications"] });
      qc.invalidateQueries({ queryKey: ["admin-trust"] });
    },
  });

  const autoRelease = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/escrow/release", { method: "POST" });
      return res.json();
    },
  });

  return (
    <AdminLegacyWrap>
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Trust & Safety</h1>
          <p className="mt-1 text-sm text-muted-foreground">Monitor platform integrity, resolve disputes, and manage verifications.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={autoRelease.isPending}
          onClick={() => autoRelease.mutate()}
        >
          {autoRelease.isPending ? "Running…" : "⚡ Auto-Release Escrows"}
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Open Disputes", value: trust?.openDisputes ?? "—", icon: ShieldAlert, color: "text-red-600" },
          { label: "Pending Verifications", value: trust?.pendingVerifications ?? "—", icon: BadgeCheck, color: "text-amber-600" },
          { label: "Failed Payments", value: trust?.failedPayments ?? "—", icon: AlertTriangle, color: "text-orange-600" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <c.icon className={`h-5 w-5 ${c.color}`} />
            <p className={`mt-2 text-3xl font-bold font-display ${c.color}`}>{c.value}</p>
            <p className="text-sm font-medium text-neutral-900">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Fraud detection */}
      {(fraud?.flags?.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Fraud & Risk Flags
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              {fraud?.summary.high ?? 0} high · {fraud?.summary.total ?? 0} total
            </span>
          </h2>
          <div className="space-y-2">
            {(fraud?.flags ?? []).map((flag) => (
              <div
                key={flag.id}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  flag.severity === "high"
                    ? "border-red-200 bg-red-50"
                    : flag.severity === "medium"
                      ? "border-amber-200 bg-amber-50"
                      : "border-border bg-card"
                }`}
              >
                <p className="font-semibold">{flag.title}</p>
                <p className="mt-1 text-neutral-800">{flag.description}</p>
                <p className="mt-1 text-xs text-neutral-600">
                  {flag.entityType} · {format(new Date(flag.detectedAt), "MMM d, HH:mm")}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Open Disputes */}
      <section>
        <h2 className="mb-4 font-semibold">Open Disputes</h2>
        <div className="space-y-3">
          {(disputes ?? []).filter((d) => ["OPEN", "UNDER_REVIEW"].includes(d.status)).map((d) => (
            <div key={d.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-semibold">{d.booking.listing.title}</p>
                  <p className="text-sm text-neutral-700">
                    Customer: {d.booking.customer.fullName ?? d.booking.customer.email} ·
                    Vendor: {d.booking.vendor.businessName}
                  </p>
                  <p className="text-sm text-neutral-700">
                    Amount: {formatCurrency(d.booking.totalAmount)} ·
                    Escrow: {d.booking.payments[0]?.escrowStatus ?? "—"}
                  </p>
                  <div className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">
                    <strong>Reason:</strong> {d.reason}
                  </div>
                  <div className="mt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                      Evidence ({d.evidence?.length ?? 0})
                    </p>
                    <DisputeEvidenceGallery evidence={d.evidence ?? []} />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50 gap-1"
                    disabled={resolveDispute.isPending}
                    onClick={() => resolveDispute.mutate({ id: d.id, resolution: "FULL_REFUND", adminNotes: "Admin refund" })}
                  >
                    <XCircle className="h-3.5 w-3.5" /> Refund customer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1"
                    disabled={resolveDispute.isPending}
                    onClick={() => resolveDispute.mutate({ id: d.id, resolution: "FULL_PAYOUT", adminNotes: "Admin payout" })}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Release to vendor
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resolveDispute.isPending}
                    onClick={() => setPartialDisputeId(d.id)}
                  >
                    Partial split
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-xs text-neutral-600">Opened {format(new Date(d.createdAt), "MMM d, yyyy")}</p>
            </div>
          ))}
          {(disputes ?? []).filter((d) => ["OPEN", "UNDER_REVIEW"].includes(d.status)).length === 0 && (
            <EmptyState title="No open disputes" description="All disputes are resolved or none have been filed." />
          )}
        </div>
      </section>

      <Dialog open={!!partialDisputeId} onOpenChange={(open) => !open && setPartialDisputeId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partial dispute resolution</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="partial-percent">Vendor payout percent (0–100)</Label>
            <Input
              id="partial-percent"
              type="number"
              min={0}
              max={100}
              value={partialPercent}
              onChange={(e) => setPartialPercent(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Remaining amount is refunded to the customer via Paystack when configured.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPartialDisputeId(null)}>
              Cancel
            </Button>
            <Button
              disabled={resolveDispute.isPending || !partialDisputeId}
              onClick={() => {
                if (!partialDisputeId) return;
                resolveDispute.mutate({
                  id: partialDisputeId,
                  resolution: "PARTIAL",
                  adminNotes: `Partial: ${partialPercent}% vendor payout`,
                  partialVendorPercent: Number(partialPercent),
                });
              }}
            >
              Resolve partial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verification Requests */}
      <section>
        <h2 className="mb-4 font-semibold">Pending Verification Requests</h2>
        <div className="space-y-3">
          {(verifications ?? []).filter((v) => v.status === "PENDING").map((v) => (
            <div key={v.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-semibold">{v.vendor.businessName}</p>
                  <p className="text-sm text-neutral-700">
                    {v.vendor.user.email} · {v.vendor.city}
                  </p>
                  {v.notes && <p className="text-sm text-neutral-800">{v.notes}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {v.documents.map((doc, i) => (
                      <a
                        key={i}
                        href={doc}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary underline"
                      >
                        Document {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="gradient"
                    className="gap-1"
                    disabled={reviewVerification.isPending}
                    onClick={() => reviewVerification.mutate({ id: v.id, action: "APPROVE" })}
                  >
                    <BadgeCheck className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50 gap-1"
                    disabled={reviewVerification.isPending}
                    onClick={() => reviewVerification.mutate({ id: v.id, action: "REJECT" })}
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-xs text-neutral-600">Submitted {format(new Date(v.createdAt), "MMM d, yyyy")}</p>
            </div>
          ))}
          {(verifications ?? []).filter((v) => v.status === "PENDING").length === 0 && (
            <p className="text-sm text-muted-foreground">No pending verification requests.</p>
          )}
        </div>
      </section>

      {/* High-Risk Vendors */}
      {(trust?.highCancellationVendors ?? []).length > 0 && (
        <section>
          <h2 className="mb-4 font-semibold">High Cancellation Rate Vendors</h2>
          <div className="space-y-2">
            {(trust?.highCancellationVendors ?? []).map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{v.businessName}</p>
                  <p className="text-xs text-neutral-700">
                    Cancellation: {v.cancellationRate ?? 0}% · Disputes: {v.disputeRate ?? 0}%
                  </p>
                </div>
                {v.verified ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" /> Verified</span>
                ) : (
                  <span className="text-xs text-neutral-600">Unverified</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Audit log */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <Activity className="h-4 w-4" /> Recent Activity
        </h2>
        <div className="space-y-1 rounded-2xl border border-border bg-card p-4">
          {(trust?.recentAuditLogs ?? []).map((log) => (
            <div key={log.id} className="flex items-baseline justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
              <div className="min-w-0 text-neutral-900">
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-mono font-medium text-neutral-900">{log.action}</span>
                {" "}
                <span className="text-neutral-800">{log.entityType}</span>
                {log.actor && <span className="text-neutral-700"> · {log.actor.fullName ?? log.actor.email}</span>}
              </div>
              <span className="shrink-0 text-xs text-neutral-600">{format(new Date(log.createdAt), "MMM d, HH:mm")}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
    </AdminLegacyWrap>
  );
}
