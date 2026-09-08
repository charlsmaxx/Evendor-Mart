"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { slugify } from "@/lib/utils";
import { VendorMediaFields } from "@/components/onboarding/venue-photos-fields";
import { BankAccountFields } from "@/components/onboarding/bank-account-fields";
import { VenueOfferingsPicker } from "@/components/vendor/venue-offerings-picker";
import {
  PORTFOLIO_CATEGORIES,
  SERVICE_VENDOR_CATEGORIES,
  SPECIALTY_SUGGESTIONS,
  createEmptyService,
  type Step1Business as Step1BusinessDraft,
  type VendorOnboardingDraft,
  type DraftUpdater,
} from "@/lib/vendor-onboarding/types";
import { DAY_LABELS, type DayKey } from "@/lib/vendor-availability";
import type { BankAccountInput } from "@/lib/validations/bank";
import { MAX_FEATURED_CLIPS, MAX_FEATURED_IMAGES } from "@/lib/vendor-media";

function CommaListField({
  items,
  onCommit,
  placeholder,
}: {
  items: string[];
  onCommit: (items: string[]) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(items.join(", "));

  useEffect(() => {
    if (!focused) setText(items.join(", "));
  }, [items, focused]);

  return (
    <Input
      value={focused ? text : items.join(", ")}
      placeholder={placeholder}
      onFocus={() => {
        setFocused(true);
        setText(items.join(", "));
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setFocused(false);
        onCommit(
          text
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean)
        );
      }}
    />
  );
}

function step1Equal(left: Step1BusinessDraft, right: Step1BusinessDraft) {
  return (
    left.businessName === right.businessName &&
    left.slug === right.slug &&
    left.avatarUrl === right.avatarUrl &&
    left.coverImageUrl === right.coverImageUrl &&
    left.category === right.category &&
    left.secondaryCategory === right.secondaryCategory &&
    left.tagline === right.tagline &&
    left.description === right.description &&
    left.aboutVendor === right.aboutVendor &&
    left.yearsExperience === right.yearsExperience &&
    left.teamSize === right.teamSize &&
    left.establishedYear === right.establishedYear &&
    left.languages.length === right.languages.length &&
    left.languages.every((language, index) => language === right.languages[index])
  );
}

export function Step1Business({
  draft,
  update,
  isVenue,
}: {
  draft: VendorOnboardingDraft;
  update: DraftUpdater;
  isVenue: boolean;
}) {
  const [localStep1, setLocalStep1] = useState<Step1BusinessDraft>(() => draft.step1);
  const localStep1Ref = useRef(localStep1);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");

  const syncStep1 = useCallback(() => {
    if (syncTimer.current) {
      clearTimeout(syncTimer.current);
      syncTimer.current = null;
    }
    dirty.current = false;
    update({ step1: localStep1Ref.current });
  }, [update]);

  const scheduleSync = useCallback(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(syncStep1, 300);
  }, [syncStep1]);

  const setStep1Field = useCallback((patch: Partial<Step1BusinessDraft>, flush = false) => {
    const next = { ...localStep1Ref.current, ...patch };
    localStep1Ref.current = next;
    dirty.current = true;
    setLocalStep1(next);
    if (flush) syncStep1();
    else scheduleSync();
  }, [scheduleSync, syncStep1]);

  useEffect(() => {
    if (!dirty.current && !step1Equal(localStep1Ref.current, draft.step1)) {
      localStep1Ref.current = draft.step1;
      setLocalStep1(draft.step1);
    }
  }, [draft.step1]);

  useEffect(() => {
    return () => {
      syncStep1();
    };
  }, [syncStep1]);

  const s = localStep1;

  async function checkSlug(value: string) {
    const slug = slugify(value);
    setStep1Field({ slug }, true);
    if (slug.length < 3) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    const res = await fetch(`/api/onboarding/vendor/slug?slug=${encodeURIComponent(slug)}`);
    const json = await res.json();
    setSlugStatus(json.data?.available ? "ok" : "taken");
    if (json.data?.slug) setStep1Field({ slug: json.data.slug }, true);
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div>
        <h2 className="font-display text-xl font-semibold">Business information</h2>
        <p className="text-sm text-muted-foreground">Tell customers who you are and what you do.</p>
      </div>

      <VendorMediaFields
        avatarUrl={s.avatarUrl}
        coverImageUrl={s.coverImageUrl}
        featuredImages={[]}
        onAvatarChange={(url) => setStep1Field({ avatarUrl: url }, true)}
        onCoverChange={(url) => setStep1Field({ coverImageUrl: url }, true)}
        onFeaturedChange={() => {}}
        showFeatured={false}
        showClips={false}
        title="Logo & cover banner"
        description="Your logo and cover appear on your public storefront."
      />

      <div className="space-y-2">
        <Label>Business name *</Label>
        <Input
          value={s.businessName}
          onChange={(e) => setStep1Field({ businessName: e.target.value })}
          onBlur={() => {
            if (!localStep1Ref.current.slug) void checkSlug(localStep1Ref.current.businessName);
            else syncStep1();
          }}
          placeholder="Chuks Photography"
        />
      </div>

      {/* <div className="space-y-2">
        <Label>Profile URL</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground shrink-0">evendor.ng/vendors/</span>
          <Input
            value={s.slug}
            onChange={(e) => setStep1Field({ slug: slugify(e.target.value) })}
            onBlur={(e) => void checkSlug(e.target.value)}
            placeholder="chuks-photography"
          />
        </div>
        {slugStatus === "ok" && <p className="text-xs text-emerald-600">URL available</p>}
        {slugStatus === "taken" && <p className="text-xs text-red-600">URL taken — try another</p>}
      </div> */}

      {!isVenue && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Primary category *</Label>
            <select
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
              value={s.category}
              onChange={(e) => setStep1Field({ category: e.target.value }, true)}
            >
              {SERVICE_VENDOR_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Secondary category</Label>
            <select
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
              value={s.secondaryCategory ?? ""}
              onChange={(e) => setStep1Field({ secondaryCategory: e.target.value }, true)}
            >
              <option value="">Optional</option>
              {SERVICE_VENDOR_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Business tagline</Label>
        <Input
          value={s.tagline}
          onChange={(e) => setStep1Field({ tagline: e.target.value })}
          onBlur={syncStep1}
          placeholder="Luxury wedding stories, beautifully told"
        />
      </div>

      <div className="space-y-2">
        <Label>Business description *</Label>
        <Textarea
          rows={4}
          value={s.description}
          onChange={(e) => setStep1Field({ description: e.target.value })}
          onBlur={syncStep1}
          placeholder="Describe your business, style, and what makes you unique…"
        />
      </div>

      <div className="space-y-2">
        <div>
          <Label>About you</Label>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell customers a little about yourself, your experience, and what makes your business special.
          </p>
        </div>
        <Textarea
          rows={4}
          value={s.aboutVendor ?? ""}
          onChange={(e) => setStep1Field({ aboutVendor: e.target.value })}
          onBlur={syncStep1}
          placeholder="Tell customers about yourself, your experience, and what makes you unique..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Years of experience</Label>
          <Input value={s.yearsExperience} onChange={(e) => setStep1Field({ yearsExperience: e.target.value })} onBlur={syncStep1} placeholder="5+" />
        </div>
        <div className="space-y-2">
          <Label>Team size</Label>
          <Input value={s.teamSize} onChange={(e) => setStep1Field({ teamSize: e.target.value })} onBlur={syncStep1} placeholder="Solo / 5 people" />
        </div>
        <div className="space-y-2">
          <Label>Established year</Label>
          <Input value={s.establishedYear} onChange={(e) => setStep1Field({ establishedYear: e.target.value })} onBlur={syncStep1} placeholder="2018" />
        </div>
        <div className="space-y-2">
          <Label>Languages spoken</Label>
          <CommaListField
            items={s.languages}
            placeholder="English, Yoruba"
            onCommit={(languages) => setStep1Field({ languages }, true)}
          />
        </div>
      </div>
    </div>
  );
}

export function Step2Location({ draft, update }: { draft: VendorOnboardingDraft; update: DraftUpdater }) {
  const s = draft.step2;
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div>
        <h2 className="font-display text-xl font-semibold">Location</h2>
        <p className="text-sm text-muted-foreground">Powers search filters and local discovery.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Country</Label>
          <Input value={s.country} onChange={(e) => update({ step2: { country: e.target.value } })} />
        </div>
        <div className="space-y-2">
          <Label>State *</Label>
          <Input value={s.state} onChange={(e) => update({ step2: { state: e.target.value } })} placeholder="Rivers" />
        </div>
        <div className="space-y-2">
          <Label>City *</Label>
          <Input value={s.city} onChange={(e) => update({ step2: { city: e.target.value } })} placeholder="Port Harcourt" />
        </div>
        <div className="space-y-2">
          <Label>Service radius (km)</Label>
          <Input value={s.serviceRadiusKm} onChange={(e) => update({ step2: { serviceRadiusKm: e.target.value } })} type="number" min={1} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Business address *</Label>
        <Input value={s.address} onChange={(e) => update({ step2: { address: e.target.value } })} placeholder="Street, area, landmark" />
        <p className="text-xs text-muted-foreground">Exact address is not shown publicly — only city/area for search.</p>
      </div>
      <div className="space-y-2">
        <Label>Google Maps link</Label>
        <Input value={s.mapUrl} onChange={(e) => update({ step2: { mapUrl: e.target.value } })} placeholder="https://maps.google.com/…" />
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={s.travelsOutsideCity} onChange={(e) => update({ step2: { travelsOutsideCity: e.target.checked } })} />
          Travels outside city
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={s.travelsOutsideState} onChange={(e) => update({ step2: { travelsOutsideState: e.target.checked } })} />
          Travels outside state
        </label>
      </div>
      <div className="space-y-2">
        <Label>Travel fee policy</Label>
        <Textarea rows={2} value={s.travelFeePolicy} onChange={(e) => update({ step2: { travelFeePolicy: e.target.value } })} placeholder="Travel fees may apply outside Port Harcourt…" />
      </div>
    </div>
  );
}

export function Step3Services({
  draft,
  update,
  isVenue,
}: {
  draft: VendorOnboardingDraft;
  update: DraftUpdater;
  isVenue: boolean;
}) {
  const s = draft.step3;

  function updateService(index: number, patch: Partial<(typeof s.services)[0]>) {
    update((prev) => ({
      step3: {
        services: prev.step3.services.map((svc, i) => (i === index ? { ...svc, ...patch } : svc)),
      },
    }));
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div>
        <h2 className="font-display text-xl font-semibold">{isVenue ? "Venue offerings" : "Services & packages"}</h2>
        <p className="text-sm text-muted-foreground">Add unlimited services customers can compare and book.</p>
      </div>

      {isVenue && (
        <>
          <div className="space-y-2">
            <Label>Guest capacity *</Label>
            <Input
              type="number"
              min={1}
              value={s.capacity ?? ""}
              onChange={(e) => update({ step3: { capacity: Number(e.target.value) || undefined } })}
            />
          </div>
          <VenueOfferingsPicker
            amenities={s.amenities ?? []}
            services={s.venueServices ?? []}
            customAmenities={[]}
            customServices={[]}
            onAmenitiesChange={(amenities) => update({ step3: { amenities } })}
            onServicesChange={(venueServices) => update({ step3: { venueServices } })}
            onCustomAmenitiesChange={() => {}}
            onCustomServicesChange={() => {}}
          />
        </>
      )}

      {s.services.map((service, index) => (
        <div key={service.id} className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium">Service {index + 1}</p>
            {s.services.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => update((prev) => ({ step3: { services: prev.step3.services.filter((_, i) => i !== index) } }))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Input placeholder="Service name" value={service.name} onChange={(e) => updateService(index, { name: e.target.value })} />
          <Textarea placeholder="Description" rows={2} value={service.description} onChange={(e) => updateService(index, { description: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input type="number" placeholder="Starting price" value={service.priceMin || ""} onChange={(e) => updateService(index, { priceMin: Number(e.target.value) })} />
            <Input type="number" placeholder="Max price (optional)" value={service.priceMax ?? ""} onChange={(e) => updateService(index, { priceMax: Number(e.target.value) || undefined })} />
            <Input placeholder="Duration" value={service.duration ?? ""} onChange={(e) => updateService(index, { duration: e.target.value })} />
          </div>
          <select
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
            value={service.badge ?? ""}
            onChange={(e) => updateService(index, { badge: e.target.value as typeof service.badge })}
          >
            <option value="">No badge</option>
            <option value="popular">Popular</option>
            <option value="best_value">Best Value</option>
            <option value="premium">Premium</option>
          </select>
        </div>
      ))}

      <Button type="button" variant="outline" className="gap-2" onClick={() => update((prev) => ({ step3: { services: [...prev.step3.services, createEmptyService()] } }))}>
        <Plus className="h-4 w-4" /> Add another service
      </Button>

      <div className="space-y-2">
        <Label>Terms & conditions</Label>
        <Textarea rows={3} value={s.termsAndConditions ?? ""} onChange={(e) => update({ step3: { termsAndConditions: e.target.value } })} />
      </div>
    </div>
  );
}

export function Step4Portfolio({ draft, update }: { draft: VendorOnboardingDraft; update: DraftUpdater }) {
  const s = draft.step4;
  const imageSlots = Array.from({ length: MAX_FEATURED_IMAGES }, (_, i) => s.featuredImages[i] ?? null);
  const clipSlots = Array.from({ length: MAX_FEATURED_CLIPS }, (_, i) => s.featuredClips[i] ?? null);

  function toggleCategory(cat: string) {
    const next = s.portfolioCategories.includes(cat)
      ? s.portfolioCategories.filter((c) => c !== cat)
      : [...s.portfolioCategories, cat];
    update({ step4: { portfolioCategories: next } });
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div>
        <h2 className="font-display text-xl font-semibold">Portfolio</h2>
        <p className="text-sm text-muted-foreground">Showcase your best work with photos and video clips.</p>
      </div>

      <VendorMediaFields
        avatarUrl={null}
        coverImageUrl={null}
        featuredImages={imageSlots}
        featuredClips={clipSlots}
        onAvatarChange={() => {}}
        onCoverChange={() => {}}
        onFeaturedChange={(slots) =>
          update({ step4: { featuredImages: slots.filter((x): x is NonNullable<typeof x> => Boolean(x)) } })
        }
        onClipsChange={(slots) =>
          update({ step4: { featuredClips: slots.filter((x): x is NonNullable<typeof x> => Boolean(x)) } })
        }
        showProfile={false}
        title="Featured work"
        description="Upload up to 7 photos and 3 video clips. Drag to reorder in portfolio after publishing."
      />

      <div className="space-y-2">
        <Label>Portfolio categories</Label>
        <div className="flex flex-wrap gap-2">
          {PORTFOLIO_CATEGORIES.map((cat) => (
            <Badge
              key={cat}
              variant={s.portfolioCategories.includes(cat) ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => toggleCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Step5BusinessDetails({ draft, update }: { draft: VendorOnboardingDraft; update: DraftUpdater }) {
  const s = draft.step5;
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div>
        <h2 className="font-display text-xl font-semibold">Business details</h2>
        <p className="text-sm text-muted-foreground">
          Customers contact you through Evendor Chat only. Phone, WhatsApp, and personal email are never shown publicly.
        </p>
      </div>
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
        All bookings and conversations stay on Evendor — protecting escrow, rewards, and dispute resolution.
      </div>
      <div className="space-y-2">
        <Label>Business email (private)</Label>
        <Input type="email" value={s.businessEmail} onChange={(e) => update({ step5: { businessEmail: e.target.value } })} placeholder="admin@yourbusiness.com" />
        <p className="text-xs text-muted-foreground">Used for account administration only — not visible to customers.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {(["instagram", "facebook", "tiktok", "youtube", "website"] as const).map((key) => (
          <div key={key} className="space-y-2">
            <Label className="capitalize">{key === "website" ? "Official website" : key}</Label>
            <Input
              value={s[key]}
              onChange={(e) => update({ step5: { [key]: e.target.value } })}
              placeholder={key === "website" ? "https://…" : `@handle or URL`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Step6Availability({ draft, update }: { draft: VendorOnboardingDraft; update: DraftUpdater }) {
  const s = draft.step6;
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div>
        <h2 className="font-display text-xl font-semibold">Availability</h2>
        <p className="text-sm text-muted-foreground">Integrates with your booking calendar.</p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={s.vacationMode} onChange={(e) => update({ step6: { ...s, vacationMode: e.target.checked } })} />
        Vacation mode (temporarily unavailable)
      </label>
      <div className="space-y-3">
        {(Object.keys(DAY_LABELS) as DayKey[]).map((day) => (
          <div key={day} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-sm">
            <label className="flex w-28 items-center gap-2">
              <input
                type="checkbox"
                checked={s.workingHours[day].enabled}
                onChange={(e) =>
                  update({
                    step6: {
                      ...s,
                      workingHours: { ...s.workingHours, [day]: { ...s.workingHours[day], enabled: e.target.checked } },
                    },
                  })
                }
              />
              {DAY_LABELS[day]}
            </label>
            <Input
              type="time"
              className="w-32"
              disabled={!s.workingHours[day].enabled}
              value={s.workingHours[day].start}
              onChange={(e) =>
                update({
                  step6: {
                    ...s,
                    workingHours: { ...s.workingHours, [day]: { ...s.workingHours[day], start: e.target.value } },
                  },
                })
              }
            />
            <span>to</span>
            <Input
              type="time"
              className="w-32"
              disabled={!s.workingHours[day].enabled}
              value={s.workingHours[day].end}
              onChange={(e) =>
                update({
                  step6: {
                    ...s,
                    workingHours: { ...s.workingHours, [day]: { ...s.workingHours[day], end: e.target.value } },
                  },
                })
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Step7Preferences({ draft, update }: { draft: VendorOnboardingDraft; update: DraftUpdater }) {
  const s = draft.step7;

  function toggleChip(field: "specialties" | "tags", value: string) {
    const list = s[field];
    const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
    update({ step7: { [field]: next } });
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div>
        <h2 className="font-display text-xl font-semibold">Business preferences</h2>
        <p className="text-sm text-muted-foreground">Booking rules and internal search optimization.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Booking approval</Label>
          <select
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
            value={s.bookingApproval}
            onChange={(e) => update({ step7: { bookingApproval: e.target.value as typeof s.bookingApproval } })}
          >
            <option value="instant">Instant booking</option>
            <option value="approval_required">Approval required</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Minimum notice (hours)</Label>
          <Input type="number" value={s.minimumNoticeHours} onChange={(e) => update({ step7: { minimumNoticeHours: Number(e.target.value) } })} />
        </div>
        <div className="space-y-2">
          <Label>Max advance booking (days)</Label>
          <Input type="number" value={s.maxAdvanceBookingDays} onChange={(e) => update({ step7: { maxAdvanceBookingDays: Number(e.target.value) } })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Cancellation policy</Label>
        <Textarea rows={2} value={s.cancellationPolicy} onChange={(e) => update({ step7: { cancellationPolicy: e.target.value } })} />
      </div>
      <div className="space-y-2">
        <Label>Reschedule policy</Label>
        <Textarea rows={2} value={s.reschedulePolicy} onChange={(e) => update({ step7: { reschedulePolicy: e.target.value } })} />
      </div>
      <div className="space-y-2">
        <Label>Specialties (powers Evendor search)</Label>
        <div className="flex flex-wrap gap-2">
          {SPECIALTY_SUGGESTIONS.map((tag) => (
            <Badge key={tag} variant={s.specialties.includes(tag) ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggleChip("specialties", tag)}>
              {tag}
            </Badge>
          ))}
        </div>
        <CommaListField
          items={s.keywords}
          placeholder="Add custom keywords, comma-separated"
          onCommit={(keywords) => update({ step7: { keywords } })}
        />
      </div>
    </div>
  );
}

export function Step8Payouts({ draft, update }: { draft: VendorOnboardingDraft; update: DraftUpdater }) {
  const s = draft.step8;
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div>
        <h2 className="font-display text-xl font-semibold">Payouts & verification</h2>
        <p className="text-sm text-muted-foreground">Verify your bank account to receive payouts. Bank details are never shown to customers.</p>
      </div>
      <BankAccountFields
        value={s as Partial<BankAccountInput>}
        onChange={(next) => update({ step8: next })}
      />
    </div>
  );
}
