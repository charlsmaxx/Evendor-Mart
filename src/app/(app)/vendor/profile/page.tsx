"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { BadgeCheck, Save, Instagram, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { VendorPageHeader, VendorSkeleton } from "@/components/vendor/vendor-ui";
import { PackageEditor, normalizePackages, type VendorPackage } from "@/components/vendor/package-editor";
import { ProfileContentEditor } from "@/components/vendor/profile-content-editor";
import {
  VendorMediaFields,
  featuredImagesPayload,
  featuredClipsPayload,
  type FeaturedImage,
  type FeaturedClip,
} from "@/components/onboarding/venue-photos-fields";
import { MAX_FEATURED_CLIPS, MAX_FEATURED_IMAGES } from "@/lib/vendor-media";
import {
  normalizeFaqs,
  normalizeServiceRequirements,
  normalizeServicesOffered,
  type ProfileFaq,
  type ServiceRequirement,
} from "@/lib/vendor-profile-content";
import { reportClientError } from "@/lib/client-error";

type ProfileData = {
  businessName: string;
  bio: string | null;
  city: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  featuredImages: FeaturedImage[];
  featuredClips: FeaturedClip[];
  verified: boolean;
  verificationStatus: string;
  experience: string;
  address: string;
  socialLinks: Record<string, string>;
  packages: VendorPackage[];
  listings: { id: string; title: string; status: string }[];
  faqs: ProfileFaq[];
  serviceRequirements: ServiceRequirement[];
  servicesOffered: string[];
};

function padMedia<T>(items: T[], max: number) {
  const slots = [...items];
  while (slots.length < max) slots.push(null as T);
  return slots.slice(0, max);
}

export default function VendorProfilePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["vendor-profile"],
    queryFn: async () => {
      const res = await fetch("/api/vendor/profile");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message);
      return json.data as ProfileData;
    },
  });

  const [form, setForm] = useState<Partial<ProfileData>>({});
  const [packages, setPackages] = useState<VendorPackage[] | null>(null);
  const [faqs, setFaqs] = useState<ProfileFaq[] | null>(null);
  const [requirements, setRequirements] = useState<ServiceRequirement[] | null>(null);
  const [servicesOffered, setServicesOffered] = useState<string[] | null>(null);
  const [featuredSlots, setFeaturedSlots] = useState<(FeaturedImage | null)[] | null>(null);
  const [clipSlots, setClipSlots] = useState<(FeaturedClip | null)[] | null>(null);

  useEffect(() => {
    if (!data) return;
    if (packages === null) setPackages(normalizePackages(data.packages ?? []));
    if (faqs === null) setFaqs(normalizeFaqs(data.faqs ?? []));
    if (requirements === null) {
      setRequirements(normalizeServiceRequirements(data.serviceRequirements ?? []));
    }
    if (servicesOffered === null) {
      setServicesOffered(normalizeServicesOffered(data.servicesOffered ?? []));
    }
    if (featuredSlots === null) {
      setFeaturedSlots(padMedia(data.featuredImages ?? [], MAX_FEATURED_IMAGES));
    }
    if (clipSlots === null) {
      setClipSlots(padMedia(data.featuredClips ?? [], MAX_FEATURED_CLIPS));
    }
  }, [data, packages, faqs, requirements, servicesOffered, featuredSlots, clipSlots]);

  const profile = { ...data, ...form } as ProfileData | undefined;
  const packageTiers = packages ?? normalizePackages(profile?.packages ?? []);
  const faqItems = faqs ?? normalizeFaqs(profile?.faqs ?? []);
  const requirementItems =
    requirements ?? normalizeServiceRequirements(profile?.serviceRequirements ?? []);
  const serviceItems = servicesOffered ?? normalizeServicesOffered(profile?.servicesOffered ?? []);
  const imageSlots = featuredSlots ?? padMedia(profile?.featuredImages ?? [], MAX_FEATURED_IMAGES);
  const videoSlots = clipSlots ?? padMedia(profile?.featuredClips ?? [], MAX_FEATURED_CLIPS);

  const mediaDirty = useMemo(() => {
    if (!data || featuredSlots === null || clipSlots === null) return false;
    const initialImages = padMedia(data.featuredImages ?? [], MAX_FEATURED_IMAGES);
    const initialClips = padMedia(data.featuredClips ?? [], MAX_FEATURED_CLIPS);
    const imagesChanged = featuredSlots.some((slot, i) => slot?.url !== initialImages[i]?.url);
    const clipsChanged = clipSlots.some((slot, i) => slot?.url !== initialClips[i]?.url);
    return imagesChanged || clipsChanged;
  }, [data, featuredSlots, clipSlots]);

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/vendor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error?.message);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor-profile"] });
      setFeaturedSlots(null);
      setClipSlots(null);
    },
    onError: (e) => reportClientError("vendor-profile", e),
  });

  if (isLoading || !profile) return <VendorSkeleton />;

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const profileDirty = Object.keys(form).length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <VendorPageHeader
        title="Profile"
        subtitle="Manage your business identity, photos, clips, and contact details."
        action={
          !profile.verified && (
            <Link href="/vendor/verification">
              <Button variant="gradient" size="sm" className="gap-2">
                <BadgeCheck className="h-4 w-4" /> Get Verified
              </Button>
            </Link>
          )
        }
      />

      <div className="rounded-2xl border border-border/80 bg-card/80 p-6 backdrop-blur-sm space-y-6">
        <VendorMediaFields
          avatarUrl={profile.avatarUrl}
          coverImageUrl={profile.coverImageUrl}
          featuredImages={imageSlots}
          featuredClips={videoSlots}
          onAvatarChange={(url) => update("avatarUrl", url ?? "")}
          onCoverChange={(url) => update("coverImageUrl", url ?? "")}
          onFeaturedChange={setFeaturedSlots}
          onClipsChange={setClipSlots}
          title="Profile photos & clips"
        />

        <div className="space-y-2">
          <Label>Business Name</Label>
          <Input value={profile.businessName} onChange={(e) => update("businessName", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Bio</Label>
          <Textarea value={profile.bio ?? ""} onChange={(e) => update("bio", e.target.value)} rows={4} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Experience</Label>
            <Input value={profile.experience} onChange={(e) => update("experience", e.target.value)} placeholder="5+ years" />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={profile.city} onChange={(e) => update("city", e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Address</Label>
          <Input value={profile.address} onChange={(e) => update("address", e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={profile.phone ?? ""} onChange={(e) => update("phone", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile.email} disabled className="opacity-60" />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Instagram className="h-4 w-4" /> Social Links
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["instagram", "facebook", "tiktok", "website"] as const).map((key) => (
              <div key={key} className="space-y-1">
                <Label className="capitalize">{key}</Label>
                <Input
                  value={profile.socialLinks?.[key] ?? form.socialLinks?.[key] ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      socialLinks: { ...profile.socialLinks, ...f.socialLinks, [key]: e.target.value },
                    }))
                  }
                  placeholder={key === "website" ? "https://yoursite.com" : `@handle`}
                />
              </div>
            ))}
          </div>
        </div>

        <Button
          variant="gradient"
          className="gap-2"
          disabled={save.isPending || (!profileDirty && !mediaDirty)}
          onClick={() =>
            save.mutate({
              businessName: profile.businessName,
              bio: profile.bio,
              city: profile.city,
              phone: profile.phone,
              avatarUrl: profile.avatarUrl,
              coverImageUrl: profile.coverImageUrl,
              experience: profile.experience,
              address: profile.address,
              socialLinks: profile.socialLinks,
              featuredImages: featuredImagesPayload(imageSlots),
              featuredClips: featuredClipsPayload(videoSlots),
              packages: packageTiers.map((p) => ({
                ...p,
                features: p.features.map((f) => f.trim()).filter(Boolean),
              })),
            })
          }
        >
          <Save className="h-4 w-4" /> Save Profile
        </Button>
        {save.isSuccess && <p className="text-sm text-emerald-600">Profile updated.</p>}
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/80 p-6 backdrop-blur-sm space-y-4">
        <div>
          <p className="font-semibold">Service packages</p>
          <p className="text-sm text-muted-foreground">
            Create unlimited packages with add-ons and a cancellation policy. Only active packages
            appear to customers at booking.
          </p>
        </div>
        <PackageEditor value={packageTiers} onChange={(next) => setPackages(next)} />
        <Button
          variant="outline"
          size="sm"
          disabled={save.isPending}
          onClick={() =>
            save.mutate({
              packages: packageTiers.map((p) => ({
                ...p,
                features: p.features.map((f) => f.trim()).filter(Boolean),
              })),
            })
          }
        >
          Save packages
        </Button>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/80 p-6 backdrop-blur-sm space-y-4">
        <div>
          <p className="font-semibold">Profile content</p>
          <p className="text-sm text-muted-foreground">
            Services, FAQs, and Service Requirements shown on your public profile.
          </p>
        </div>
        <ProfileContentEditor
          faqs={faqItems}
          onFaqsChange={setFaqs}
          requirements={requirementItems}
          onRequirementsChange={setRequirements}
          servicesOffered={serviceItems}
          onServicesOfferedChange={setServicesOffered}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={save.isPending}
          onClick={() =>
            save.mutate({
              faqs: faqItems
                .map((f, i) => ({ ...f, sortOrder: i }))
                .filter((f) => f.question.trim() && f.answer.trim()),
              serviceRequirements: requirementItems
                .map((r, i) => ({ ...r, sortOrder: i, text: r.text.trim() }))
                .filter((r) => r.text),
              servicesOffered: serviceItems,
            })
          }
        >
          Save profile content
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/vendor/portfolio" className="rounded-xl border border-border p-4 hover:border-primary/30">
          <p className="font-medium">Portfolio</p>
          <p className="text-sm text-muted-foreground">Manage additional photos & videos</p>
        </Link>
        <Link href="/vendor/services" className="rounded-xl border border-border p-4 hover:border-primary/30">
          <p className="font-medium">Services</p>
          <p className="text-sm text-muted-foreground">{profile.listings.length} listing(s)</p>
        </Link>
        <Link href="/vendor/reviews" className="rounded-xl border border-border p-4 hover:border-primary/30">
          <p className="font-medium">Reviews</p>
          <p className="text-sm text-muted-foreground">Reputation & replies</p>
        </Link>
        <Link href="/vendor/revenue" className="rounded-xl border border-border p-4 hover:border-primary/30">
          <p className="font-medium flex items-center gap-1"><Globe className="h-4 w-4" /> Revenue</p>
          <p className="text-sm text-muted-foreground">Analytics & earnings</p>
        </Link>
      </div>
    </div>
  );
}
