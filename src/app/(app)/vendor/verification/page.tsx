"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VendorPageHeader } from "@/components/vendor/vendor-ui";
import {
  DocumentUploadSlot,
  MultiDocumentUpload,
  type VerificationDocument,
} from "@/components/vendor/verification-document-upload";
import { reportClientError } from "@/lib/client-error";

const STATUS_CONFIG = {
  UNVERIFIED: { label: "Not Verified", icon: BadgeCheck, color: "text-muted-foreground", progress: 0 },
  PENDING: { label: "Under Review", icon: Clock, color: "text-amber-600", progress: 70 },
  VERIFIED: { label: "✓ Verified Vendor", icon: CheckCircle2, color: "text-emerald-600", progress: 100 },
  REJECTED: { label: "Rejected — Resubmit", icon: XCircle, color: "text-red-600", progress: 30 },
};

export default function VendorVerificationPage() {
  const qc = useQueryClient();
  const [governmentId, setGovernmentId] = useState<VerificationDocument | null>(null);
  const [selfie, setSelfie] = useState<VerificationDocument | null>(null);
  const [businessAddress, setBusinessAddress] = useState<VerificationDocument | null>(null);
  const [bankVerification, setBankVerification] = useState<VerificationDocument | null>(null);
  const [portfolioSamples, setPortfolioSamples] = useState<VerificationDocument[]>([]);
  const [socialLink, setSocialLink] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: cloudinaryStatus } = useQuery({
    queryKey: ["cloudinary-status"],
    queryFn: async () => {
      const res = await fetch("/api/upload/sign");
      const json = await res.json();
      return { configured: json.data?.configured === true };
    },
  });

  const { data: existingRequest } = useQuery({
    queryKey: ["vendor-verification"],
    queryFn: async () => {
      const res = await fetch("/api/vendor/verification");
      const json = await res.json();
      return json.data as {
        status: string;
        adminNotes?: string;
        documents?: string[];
        notes?: string;
        createdAt: string;
      } | null;
    },
  });

  const cloudinaryReady = cloudinaryStatus?.configured === true;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const docs = [
        governmentId,
        selfie,
        businessAddress,
        bankVerification,
        ...portfolioSamples,
      ].filter(Boolean) as VerificationDocument[];

      if (docs.length === 0) {
        throw new Error("Please upload at least one verification document from your device");
      }

      const documents = docs.map((d) => d.url);
      const payloadNotes = JSON.stringify({
        userNotes: notes.trim() || undefined,
        socialLink: socialLink.trim() || undefined,
        files: docs.map((d) => ({
          label: d.label,
          fileName: d.fileName,
          url: d.url,
        })),
      });

      const res = await fetch("/api/vendor/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents, notes: payloadNotes }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error?.message ?? "Submission failed");
      }
    },
    onSuccess: () => {
      setSubmitted(true);
      qc.invalidateQueries({ queryKey: ["vendor-verification"] });
    },
    onError: (e) => reportClientError("verification", e),
  });

  const status = existingRequest?.status ?? "UNVERIFIED";
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.UNVERIFIED;
  const uploadedCount =
    existingRequest?.documents?.length ??
    [governmentId, selfie, businessAddress, bankVerification, ...portfolioSamples].filter(Boolean).length;
  const progress = status === "VERIFIED" ? 100 : Math.min(cfg.progress + uploadedCount * 5, 95);

  const canSubmit =
    cloudinaryReady &&
    (governmentId || selfie || businessAddress || bankVerification || portfolioSamples.length > 0);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <VendorPageHeader
        title="Verification Center"
        subtitle="Upload documents directly from your phone or computer — no links required."
      />

      <div
        className="rounded-2xl border border-border/80 bg-card/80 p-5 backdrop-blur-sm"
        style={{ background: status === "VERIFIED" ? "rgba(16,185,129,0.05)" : undefined }}
      >
        <div className="flex items-center gap-3">
          <cfg.icon className={`h-7 w-7 ${cfg.color}`} />
          <div className="flex-1">
            <p className={`font-display text-lg font-bold ${cfg.color}`}>{cfg.label}</p>
            {existingRequest?.adminNotes && (
              <p className="mt-1 text-sm text-muted-foreground">{existingRequest.adminNotes}</p>
            )}
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Verification progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {status === "VERIFIED" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Your account is fully verified. The ✓ badge appears on your profile and listings.
        </div>
      ) : (
        <>
          {!cloudinaryReady && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              File uploads require Cloudinary in <code className="font-mono text-xs">.env.local</code>.
              Add <code className="font-mono text-xs">CLOUDINARY_CLOUD_NAME</code>,{" "}
              <code className="font-mono text-xs">CLOUDINARY_API_KEY</code>, and{" "}
              <code className="font-mono text-xs">CLOUDINARY_API_SECRET</code>, then restart the dev server.
            </div>
          )}

          {(status === "UNVERIFIED" || status === "REJECTED") && !submitted && (
            <div className="space-y-4 rounded-2xl border border-border/80 bg-card/80 p-5 backdrop-blur-sm">
              <div>
                <p className="font-semibold">Upload Verification Documents</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Take photos or select files from your device. Images and PDFs are stored securely via Cloudinary.
                </p>
              </div>

              <DocumentUploadSlot
                label="Government ID"
                description="National ID, driver's license, or international passport"
                value={governmentId}
                onChange={setGovernmentId}
                cloudinaryReady={cloudinaryReady}
              />

              <DocumentUploadSlot
                label="Selfie Verification"
                description="Clear photo of you holding your ID"
                accept="image/jpeg,image/png,image/webp"
                value={selfie}
                onChange={setSelfie}
                cloudinaryReady={cloudinaryReady}
              />

              <DocumentUploadSlot
                label="Business Address Proof"
                description="Utility bill, tenancy agreement, or property document"
                value={businessAddress}
                onChange={setBusinessAddress}
                cloudinaryReady={cloudinaryReady}
              />

              <DocumentUploadSlot
                label="Bank Verification"
                description="Bank statement or account verification document"
                value={bankVerification}
                onChange={setBankVerification}
                cloudinaryReady={cloudinaryReady}
              />

              <MultiDocumentUpload
                label="Portfolio Samples"
                description="Photos of your work, venue, or past events"
                minCount={3}
                values={portfolioSamples}
                onChange={setPortfolioSamples}
                cloudinaryReady={cloudinaryReady}
              />

              <div className="space-y-2">
                <Label htmlFor="social-link">Social media or website (optional)</Label>
                <Input
                  id="social-link"
                  placeholder="https://instagram.com/yourbusiness"
                  value={socialLink}
                  onChange={(e) => setSocialLink(e.target.value)}
                />
              </div>

              <Textarea
                placeholder="Notes for the admin team (optional)"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <Button
                variant="gradient"
                disabled={submitMutation.isPending || !canSubmit}
                onClick={() => submitMutation.mutate()}
                className="w-full gap-2"
              >
                <BadgeCheck className="h-4 w-4" />
                {submitMutation.isPending ? "Submitting…" : "Submit for Verification"}
              </Button>
            </div>
          )}

          {existingRequest?.documents && existingRequest.documents.length > 0 && status === "PENDING" && (
            <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
              <p className="text-sm font-medium">Submitted documents ({existingRequest.documents.length})</p>
              <ul className="mt-2 space-y-1">
                {existingRequest.documents.map((url, i) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Document {i + 1}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(submitted || status === "PENDING") && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-semibold">Under admin review</p>
              <p className="mt-1">Review typically completes within 1–3 business days.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
