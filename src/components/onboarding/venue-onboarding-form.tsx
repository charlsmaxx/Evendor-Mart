"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reportClientError } from "@/lib/client-error";
import { BankAccountFields } from "@/components/onboarding/bank-account-fields";
import {
  VendorMediaFields,
  featuredImagesPayload,
  featuredClipsPayload,
  type FeaturedImage,
  type FeaturedClip,
} from "@/components/onboarding/venue-photos-fields";
import {
  VenueOfferingsPicker,
  buildAmenitiesPayload,
  buildServicesPayload,
} from "@/components/vendor/venue-offerings-picker";
import type { BankAccountInput } from "@/lib/validations/bank";

const REQUIRE_BANK_VERIFICATION = true;

const STEPS = [
  { n: 1, label: "Event center" },
  { n: 2, label: "Photos" },
  { n: 3, label: "Venue details" },
  { n: 4, label: "Listing & pricing" },
  { n: 5, label: "Bank account" },
];

export function VenueOnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [featuredSlots, setFeaturedSlots] = useState<(FeaturedImage | null)[]>(
    Array.from({ length: 7 }, () => null)
  );
  const [clipSlots, setClipSlots] = useState<(FeaturedClip | null)[]>(
    Array.from({ length: 3 }, () => null)
  );
  const [amenityKeys, setAmenityKeys] = useState<string[]>([]);
  const [serviceKeys, setServiceKeys] = useState<string[]>([]);
  const [customAmenities, setCustomAmenities] = useState<string[]>([]);
  const [customServices, setCustomServices] = useState<string[]>([]);
  const [bankAccount, setBankAccount] = useState<Partial<BankAccountInput>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (REQUIRE_BANK_VERIFICATION && !bankAccount.accountName) {
      reportClientError("onboarding-venue", "Verify your bank account before publishing.");
      setStep(5);
      return;
    }

    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/onboarding/vendor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessKind: "VENUE",
          businessName: fd.get("businessName"),
          category: "VENUE",
          city: fd.get("city"),
          address: fd.get("address"),
          bio: fd.get("bio"),
          avatarUrl: avatarUrl || null,
          coverImageUrl: coverImageUrl || null,
          featuredImages: featuredImagesPayload(featuredSlots),
          featuredClips: featuredClipsPayload(clipSlots),
          capacity: Number(fd.get("capacity")),
          amenities: buildAmenitiesPayload(amenityKeys, customAmenities),
          services: buildServicesPayload(serviceKeys, customServices),
          termsAndConditions: String(fd.get("termsAndConditions") || "") || null,
          listingTitle: fd.get("listingTitle") || undefined,
          listingDescription: fd.get("listingDescription") || undefined,
          priceMin: fd.get("priceMin") ? Number(fd.get("priceMin")) : undefined,
          priceMax: fd.get("priceMax") ? Number(fd.get("priceMax")) : undefined,
          ...(REQUIRE_BANK_VERIFICATION ? { bankAccount } : {}),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        reportClientError("onboarding-venue", json?.error?.message ?? "Could not save profile");
        return;
      }
      router.push("/vendor/listings");
      router.refresh();
    } catch (err) {
      reportClientError("onboarding-venue", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
        Event center setup — your listing will appear in the marketplace.
      </div>

      <div className="mb-8 mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {STEPS.map((s) => (
          <button
            key={s.n}
            type="button"
            onClick={() => setStep(s.n)}
            className={`rounded-lg border px-2 py-2 text-left text-sm transition ${
              step === s.n
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border text-muted-foreground hover:border-primary/30"
            }`}
          >
            <span className="font-semibold">Step {s.n}</span>
            <span className="mt-0.5 block text-xs">{s.label}</span>
          </button>
        ))}
      </div>

      <div className={step === 1 ? "space-y-4" : "hidden"}>
        <div>
          <Label htmlFor="businessName">Event center name *</Label>
          <Input id="businessName" name="businessName" required placeholder="e.g. Corinthia Villa Suites" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="city">City *</Label>
          <Input id="city" name="city" required placeholder="Lagos" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="address">Full address *</Label>
          <Input id="address" name="address" required placeholder="Street, area, landmark…" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="bio">About your venue</Label>
          <Textarea id="bio" name="bio" rows={4} placeholder="Describe your space, event types, and atmosphere…" className="mt-1" />
        </div>
        <Button type="button" variant="gradient" className="w-full" onClick={() => setStep(2)}>
          Continue to photos
        </Button>
      </div>

      <div className={step === 2 ? "space-y-4" : "hidden"}>
        <VendorMediaFields
          avatarUrl={avatarUrl}
          coverImageUrl={coverImageUrl}
          featuredImages={featuredSlots}
          featuredClips={clipSlots}
          onAvatarChange={setAvatarUrl}
          onCoverChange={setCoverImageUrl}
          onFeaturedChange={setFeaturedSlots}
          onClipsChange={setClipSlots}
          title="Venue photos & clips"
        />
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
          <Button type="button" variant="gradient" className="flex-1" onClick={() => setStep(3)}>Continue</Button>
        </div>
      </div>

      <div className={step === 3 ? "space-y-4" : "hidden"}>
        <div>
          <Label htmlFor="capacity">Guest capacity *</Label>
          <Input id="capacity" name="capacity" type="number" min={1} required placeholder="500" className="mt-1" />
          <p className="mt-1 text-xs text-muted-foreground">Maximum number of guests your hall can host comfortably.</p>
        </div>
        <VenueOfferingsPicker
          amenities={amenityKeys}
          services={serviceKeys}
          customAmenities={customAmenities}
          customServices={customServices}
          onAmenitiesChange={setAmenityKeys}
          onServicesChange={setServiceKeys}
          onCustomAmenitiesChange={setCustomAmenities}
          onCustomServicesChange={setCustomServices}
        />
        <div>
          <Label htmlFor="termsAndConditions">Terms &amp; conditions (optional)</Label>
          <Textarea id="termsAndConditions" name="termsAndConditions" rows={3} className="mt-1" placeholder="Cancellation and deposit policy…" />
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
          <Button type="button" variant="gradient" className="flex-1" onClick={() => setStep(4)}>Continue</Button>
        </div>
      </div>

      <div className={step === 4 ? "space-y-4" : "hidden"}>
        <p className="text-sm text-muted-foreground">Set how your venue appears in the marketplace.</p>
        <div>
          <Label htmlFor="listingTitle">Listing title</Label>
          <Input id="listingTitle" name="listingTitle" placeholder="Grand ballroom & garden venue" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="listingDescription">Description</Label>
          <Textarea id="listingDescription" name="listingDescription" rows={3} placeholder="What customers get when they book your space…" className="mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="priceMin">Min price (NGN)</Label>
            <Input id="priceMin" name="priceMin" type="number" placeholder="500000" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="priceMax">Max price (NGN)</Label>
            <Input id="priceMax" name="priceMax" type="number" placeholder="2500000" className="mt-1" />
          </div>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(3)}>Back</Button>
          {REQUIRE_BANK_VERIFICATION ? (
            <Button type="button" variant="gradient" className="flex-1" onClick={() => setStep(5)}>
              Continue to bank
            </Button>
          ) : (
            <Button type="submit" variant="gradient" className="flex-1" disabled={loading}>
              {loading ? "Saving…" : "Publish event center"}
            </Button>
          )}
        </div>
      </div>

      <div className={step === 5 ? "space-y-4" : "hidden"}>
        <BankAccountFields value={bankAccount} onChange={setBankAccount} />
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(4)}>Back</Button>
          <Button type="submit" variant="gradient" className="flex-1" disabled={loading || !bankAccount.accountName}>
            {loading ? "Saving…" : "Publish event center"}
          </Button>
        </div>
      </div>
    </form>
  );
}
