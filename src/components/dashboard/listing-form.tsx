"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadField } from "@/components/vendor/profile-image-upload";
import {
  VenueOfferingsPicker,
  buildAmenitiesPayload,
  buildServicesPayload,
  parseAmenitiesFromStorage,
  parseServicesFromStorage,
} from "@/components/vendor/venue-offerings-picker";

export type ListingFormData = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  type: "SERVICE" | "VENUE";
  city: string;
  priceMin: number;
  priceMax: number;
  coverImage: string | null;
  capacity: number | null;
  address?: string | null;
  amenities?: string[];
  services?: string[];
  termsAndConditions?: string;
};

export function ListingForm({
  categoryId,
  listing,
}: {
  categoryId?: string;
  listing?: ListingFormData;
}) {
  const router = useRouter();
  const isEdit = Boolean(listing);
  const [loading, setLoading] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(listing?.coverImage ?? null);
  const [listingType, setListingType] = useState<"SERVICE" | "VENUE">(listing?.type ?? "SERVICE");
  const [amenityKeys, setAmenityKeys] = useState<string[]>([]);
  const [serviceKeys, setServiceKeys] = useState<string[]>([]);
  const [customAmenities, setCustomAmenities] = useState<string[]>([]);
  const [customServices, setCustomServices] = useState<string[]>([]);
  const [termsAndConditions, setTermsAndConditions] = useState(listing?.termsAndConditions ?? "");

  useEffect(() => {
    if (listing) {
      setCoverImage(listing.coverImage ?? null);
      setListingType(listing.type);
      const { keys: aKeys, custom: aCustom } = parseAmenitiesFromStorage(listing.amenities ?? []);
      const { keys: sKeys, custom: sCustom } = parseServicesFromStorage(listing.services ?? []);
      setAmenityKeys(aKeys);
      setCustomAmenities(aCustom);
      setServiceKeys(sKeys);
      setCustomServices(sCustom);
      setTermsAndConditions(listing.termsAndConditions ?? "");
    }
  }, [listing?.id, listing?.coverImage, listing?.type, listing?.amenities, listing?.services, listing?.termsAndConditions]);

  const { data: cloudinaryStatus } = useQuery({
    queryKey: ["cloudinary-status"],
    queryFn: async () => {
      const res = await fetch("/api/upload/sign");
      const json = await res.json();
      return { configured: json.data?.configured === true };
    },
  });

  const cloudinaryReady = cloudinaryStatus?.configured === true;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: fd.get("title"),
      description: fd.get("description"),
      categoryId: fd.get("categoryId") || categoryId || listing?.categoryId,
      type: listingType,
      city: fd.get("city"),
      priceMin: Number(fd.get("priceMin")),
      priceMax: Number(fd.get("priceMax")),
      coverImage: coverImage || undefined,
      capacity: fd.get("capacity") ? Number(fd.get("capacity")) : undefined,
      address: listingType === "VENUE" ? fd.get("address") || undefined : undefined,
      amenities: listingType === "VENUE" ? buildAmenitiesPayload(amenityKeys, customAmenities) : undefined,
      services: listingType === "VENUE" ? buildServicesPayload(serviceKeys, customServices) : undefined,
      termsAndConditions: termsAndConditions.trim() || null,
    };

    const res = await fetch(isEdit ? `/api/listings/${listing!.id}` : "/api/listings", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (res.ok) {
      if (isEdit) {
        router.push("/vendor/listings");
        router.refresh();
      } else {
        setCoverImage(null);
        setAmenityKeys([]);
        setCustomAmenities([]);
        setServiceKeys([]);
        setCustomServices([]);
        setTermsAndConditions("");
        router.refresh();
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className="glass space-y-4 rounded-2xl p-6">
      <div>
        <Label>Title</Label>
        <Input name="title" required className="mt-1" defaultValue={listing?.title} />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          name="description"
          required
          className="mt-1"
          rows={5}
          defaultValue={listing?.description}
          placeholder="Describe your venue or service in detail — capacity, style, what's included…"
        />
      </div>
      <input
        type="hidden"
        name="categoryId"
        value={listing?.categoryId ?? categoryId ?? ""}
      />

      <ImageUploadField
        label={isEdit ? "Cover photo" : "Cover image"}
        value={coverImage}
        onChange={setCoverImage}
        aspect="listing"
        uploadPurpose="portfolio"
        disabled={!cloudinaryReady}
      />
      {isEdit && coverImage && cloudinaryReady && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Use the crop button on the preview to replace your cover photo.
        </p>
      )}

      <div>
        <Label>Type</Label>
        <select
          name="type"
          value={listingType}
          onChange={(e) => setListingType(e.target.value as "SERVICE" | "VENUE")}
          className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
        >
          <option value="SERVICE">Service</option>
          <option value="VENUE">Venue / Event hall</option>
        </select>
      </div>
      <Input name="city" placeholder="City" required defaultValue={listing?.city} />
      <div className="grid grid-cols-2 gap-4">
        <Input
          name="priceMin"
          type="number"
          placeholder="Min price"
          required
          defaultValue={listing?.priceMin}
        />
        <Input
          name="priceMax"
          type="number"
          placeholder="Max price"
          required
          defaultValue={listing?.priceMax}
        />
      </div>

      {listingType === "VENUE" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="address">Venue address</Label>
            <Input
              id="address"
              name="address"
              placeholder="Full street address and landmark"
              defaultValue={listing?.address ?? undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="capacity">Guest capacity</Label>
            <Input
              id="capacity"
              name="capacity"
              type="number"
              min={1}
              placeholder="e.g. 500"
              defaultValue={listing?.capacity ?? undefined}
            />
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
        </>
      )}

      <div className="space-y-2 border-t border-border pt-4">
        <Label>Terms &amp; conditions (optional)</Label>
        <p className="text-xs text-muted-foreground">
          Cancellation policy, deposit rules, or booking terms customers should know before booking.
        </p>
        <Textarea
          value={termsAndConditions}
          onChange={(e) => setTermsAndConditions(e.target.value)}
          rows={4}
          placeholder="e.g. 50% refund if cancelled 7+ days before event…"
        />
      </div>

      <Button type="submit" variant="gradient" disabled={loading}>
        {loading
          ? isEdit
            ? "Saving…"
            : "Creating…"
          : isEdit
            ? "Save changes"
            : "Create draft listing"}
      </Button>
    </form>
  );
}
