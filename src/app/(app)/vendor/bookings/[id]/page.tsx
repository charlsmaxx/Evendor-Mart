"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  MessageSquare,
  FileText,
  CheckCircle2,
  XCircle,
  MapPin,
  AlertTriangle,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { VendorPageHeader, VendorSkeleton, BOOKING_STATUS_STYLES } from "@/components/vendor/vendor-ui";
import { EvidenceFileUpload, EvidenceLink } from "@/components/vendor/evidence-file-upload";
import { BookingSnapshotCard } from "@/components/bookings/booking-snapshot-card";
import type { BookingEvidenceItem } from "@/lib/booking-evidence";

type BookingDetail = {
  id: string;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  eventType: string | null;
  guestCount: number | null;
  totalAmount: number;
  status: string;
  notes: string | null;
  reservationExpiresAt: string | null;
  completionConfirmedAt: string | null;
  bookingSnapshot?: unknown;
  listing: { title: string; slug: string };
  customer: {
    fullName: string | null;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
  };
  payments: {
    status: string;
    escrowStatus: string;
    amount: number;
    paystackRef: string | null;
  }[];
  payout: { amount: number; status: string; reference: string } | null;
  dispute: { id: string; status: string; reason: string } | null;
  conversationId: string | null;
  vendorEvidence: BookingEvidenceItem[];
};

export default function VendorBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["vendor-booking", id],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message);
      return json.data as BookingDetail;
    },
    enabled: !!id,
  });

  const uploadEvidence = useMutation({
    mutationFn: async (payload: { url: string; publicId: string; caption?: string }) => {
      const res = await fetch(`/api/bookings/${id}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Upload failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendor-booking", id] }),
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Update failed");
      return json.data as { escrowMessage?: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor-booking", id] });
      qc.invalidateQueries({ queryKey: ["vendor-bookings"] });
    },
  });

  if (isLoading) return <VendorSkeleton />;
  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Link href="/vendor/bookings">
          <Button variant="outline">Back to bookings</Button>
        </Link>
      </div>
    );
  }

  const isPending = ["RESERVED", "PENDING_PAYMENT"].includes(data.status);
  const isConfirmed = ["CONFIRMED", "IN_PROGRESS"].includes(data.status);
  const payment = data.payments[0];
  const chatHref = data.conversationId
    ? `/messages/${data.conversationId}`
    : "/messages";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/vendor/bookings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <VendorPageHeader
          title={data.customer.fullName ?? data.customer.email}
          subtitle={data.listing.title}
        />
      </div>

      {data.bookingSnapshot != null && (
        <BookingSnapshotCard snapshot={data.bookingSnapshot} />
      )}

      {(isConfirmed || data.status === "COMPLETED") && (
        <div className="rounded-2xl border border-border/80 bg-card/80 p-5 backdrop-blur-sm space-y-3">
          <h3 className="font-semibold">Completion evidence</h3>
          <p className="text-sm text-muted-foreground">
            Upload photos or documents showing the service was delivered.
          </p>
          {data.vendorEvidence.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.vendorEvidence.map((e, i) => (
                <EvidenceLink key={`${e.url}-${i}`} url={e.url} />
              ))}
            </div>
          )}
          <EvidenceFileUpload
            purpose="booking"
            label="Upload evidence"
            disabled={uploadEvidence.isPending}
            onUploaded={(result) =>
              uploadEvidence.mutate({
                url: result.url,
                publicId: result.publicId,
              })
            }
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <span
          className={`rounded-full border px-3 py-1 text-sm font-medium ${BOOKING_STATUS_STYLES[data.status] ?? "bg-muted"}`}
        >
          {data.status.replace("_", " ")}
        </span>
        {data.dispute && (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" /> Disputed
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard icon={Calendar} label="Event date" value={format(new Date(data.eventDate), "EEE, MMM d yyyy")} />
        {data.startTime && data.endTime && (
          <InfoCard
            icon={Clock}
            label="Time"
            value={`${format(new Date(data.startTime), "h:mm a")} – ${format(new Date(data.endTime), "h:mm a")}`}
          />
        )}
        {data.guestCount && <InfoCard icon={Users} label="Guests" value={String(data.guestCount)} />}
        {data.eventType && <InfoCard icon={MapPin} label="Event type" value={data.eventType} />}
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/80 p-5 backdrop-blur-sm space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Banknote className="h-4 w-4 text-primary" /> Payment & escrow
        </h3>
        <Row label="Total" value={formatCurrency(data.totalAmount)} bold />
        <Row
          label="Payment"
          value={payment?.status === "SUCCESS" ? "✓ Paid in full" : "Pending"}
        />
        <Row label="Escrow" value={payment?.escrowStatus ?? "NONE"} />
        {data.payout && (
          <Row label="Payout" value={`${formatCurrency(data.payout.amount)} (${data.payout.status})`} />
        )}
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/80 p-5 backdrop-blur-sm space-y-2 text-sm">
        <p className="font-semibold">Customer</p>
        <p>{data.customer.fullName ?? "—"}</p>
        <p className="text-muted-foreground">{data.customer.email}</p>
        {data.customer.phone && <p className="text-muted-foreground">{data.customer.phone}</p>}
        {data.notes && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="font-medium">Notes</p>
            <p className="text-muted-foreground">{data.notes}</p>
          </div>
        )}
      </div>

      {data.reservationExpiresAt && data.status === "RESERVED" && (
        <p className="text-sm text-amber-700">
          Reservation expires {format(new Date(data.reservationExpiresAt), "h:mm a")}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {isPending && (
          <>
            <Button variant="gradient" className="gap-1.5" onClick={() => updateStatus.mutate("CONFIRMED")} disabled={updateStatus.isPending}>
              <CheckCircle2 className="h-4 w-4" /> Confirm
            </Button>
            <Button variant="outline" className="gap-1.5 text-red-600" onClick={() => updateStatus.mutate("DECLINED")} disabled={updateStatus.isPending}>
              <XCircle className="h-4 w-4" /> Decline
            </Button>
          </>
        )}
        {isConfirmed && (
          <>
            <Button variant="outline" className="gap-1.5" onClick={() => updateStatus.mutate("IN_PROGRESS")} disabled={updateStatus.isPending || data.status === "IN_PROGRESS"}>
              <MapPin className="h-4 w-4" /> Mark Arrived
            </Button>
            <Button variant="outline" className="gap-1.5" onClick={() => updateStatus.mutate("COMPLETED")} disabled={updateStatus.isPending}>
              <CheckCircle2 className="h-4 w-4" /> Mark Completed
            </Button>
          </>
        )}
        <Link href={chatHref}>
          <Button variant="outline" className="gap-1.5">
            <MessageSquare className="h-4 w-4" /> Message Client
          </Button>
        </Link>
        {data.dispute && (
          <Link href="/vendor/disputes">
            <Button variant="outline" className="gap-1.5 text-amber-700">
              <AlertTriangle className="h-4 w-4" /> View Dispute
            </Button>
          </Link>
        )}
        <Link href={`/api/bookings/${data.id}/invoice`} target="_blank">
          <Button variant="ghost" className="gap-1.5">
            <FileText className="h-4 w-4" /> Invoice
          </Button>
        </Link>
      </div>

      {updateStatus.data?.escrowMessage && (
        <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          {updateStatus.data.escrowMessage}
        </p>
      )}
      {updateStatus.error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-600">
          {(updateStatus.error as Error).message}
        </p>
      )}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <Icon className="mb-2 h-4 w-4 text-primary" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-bold text-primary" : ""}>{value}</span>
    </div>
  );
}
