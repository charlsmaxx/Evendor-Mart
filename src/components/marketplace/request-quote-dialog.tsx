"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reportClientError } from "@/lib/client-error";

type RequestQuoteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  listingId?: string;
  listingTitle?: string;
};

export function RequestQuoteDialog({
  open,
  onOpenChange,
  vendorId,
  listingId,
  listingTitle,
}: RequestQuoteDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (notes.trim().length < 10) {
      reportClientError("quote", "Please add a few more details about your event (at least 10 characters).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId,
          listingId,
          eventDate: eventDate ? new Date(eventDate).toISOString() : undefined,
          budget: budget ? Number(budget) : undefined,
          message: notes.trim(),
          details: {
            eventType: eventType.trim() || undefined,
            location: location.trim() || undefined,
            guestCount: guestCount ? Number(guestCount) : undefined,
            listingTitle: listingTitle || undefined,
          },
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (!res.ok) {
        reportClientError("quote", json?.error?.message ?? "Could not send quote request.");
        return;
      }
      setSuccess(true);
      setEventType("");
      setEventDate("");
      setLocation("");
      setGuestCount("");
      setBudget("");
      setNotes("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSuccess(false);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Request a quote</DialogTitle>
        </DialogHeader>
        {success ? (
          <div className="space-y-4 py-2">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Quote request sent. The vendor will respond in your dashboard — this is not a booking
              yet.
            </p>
            <div className="flex justify-end">
              <Button type="button" variant="gradient" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
        <p className="text-sm text-muted-foreground">
          Tell the vendor about your event. This is not a booking — you can book later after they
          respond.
        </p>
        <form onSubmit={submit} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quote-event-type">Event type</Label>
            <Input
              id="quote-event-type"
              placeholder="Wedding, birthday, conference…"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quote-date">Event date</Label>
              <Input
                id="quote-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-guests">Guest count</Label>
              <Input
                id="quote-guests"
                type="number"
                min={1}
                placeholder="e.g. 150"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quote-location">Event location</Label>
            <Input
              id="quote-location"
              placeholder="City or venue area"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quote-budget">Budget (optional)</Label>
            <Input
              id="quote-budget"
              type="number"
              min={0}
              placeholder="Amount in Naira"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quote-notes">Additional notes</Label>
            <Textarea
              id="quote-notes"
              required
              minLength={10}
              rows={4}
              placeholder="Describe what you need, preferred package, timing, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={loading}>
              {loading ? "Sending…" : "Send request"}
            </Button>
          </div>
        </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
