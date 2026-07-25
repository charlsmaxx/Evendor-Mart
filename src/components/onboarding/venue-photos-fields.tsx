"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Upload, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageUploadField } from "@/components/vendor/profile-image-upload";
import {
  isCloudinaryUploadReady,
  uploadFileToCloudinary,
  type UploadedFileResult,
} from "@/lib/upload-client";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { reportClientError } from "@/lib/client-error";
import {
  MAX_FEATURED_CLIPS,
  MAX_FEATURED_IMAGES,
  type UploadedMedia,
} from "@/lib/vendor-media";

export type FeaturedImage = UploadedMedia;
export type FeaturedClip = UploadedMedia;

function FeaturedSlot({
  index,
  value,
  onChange,
  disabled,
}: {
  index: number;
  value: FeaturedImage | null;
  onChange: (next: FeaturedImage | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const result = await uploadFileToCloudinary(file, "portfolio");
      onChange(toMedia(result));
    } catch (e) {
      reportClientError("upload", e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 8 * 1024 * 1024) {
            reportClientError("upload", "Image must be under 8MB");
            return;
          }
          setCropFile(file);
          setCropOpen(true);
        }}
      />
      {value ? (
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border">
          <Image src={value.url} alt={`Featured ${index + 1}`} fill className="object-cover" sizes="200px" />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="absolute right-2 top-2"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/30 text-xs text-muted-foreground transition hover:border-primary/40 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Photo {index + 1}
        </button>
      )}
      <ImageCropDialog
        open={cropOpen}
        file={cropFile}
        aspect="listing"
        title={`Crop featured photo ${index + 1}`}
        onCancel={() => {
          setCropOpen(false);
          setCropFile(null);
          if (inputRef.current) inputRef.current.value = "";
        }}
        onConfirm={async (cropped) => {
          setCropOpen(false);
          setCropFile(null);
          await uploadFile(cropped);
        }}
      />
    </>
  );
}

function ClipSlot({
  index,
  value,
  onChange,
  disabled,
}: {
  index: number;
  value: FeaturedClip | null;
  onChange: (next: FeaturedClip | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const result = await uploadFileToCloudinary(file, "portfolio");
      onChange(toMedia(result));
    } catch (e) {
      reportClientError("upload", e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 50 * 1024 * 1024) {
            reportClientError("upload", "Video must be under 50MB");
            return;
          }
          void uploadFile(file);
        }}
      />
      {value ? (
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-black">
          <video src={value.url} className="h-full w-full object-cover" controls />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="absolute right-2 top-2"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/30 text-xs text-muted-foreground transition hover:border-primary/40 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
          Clip {index + 1}
        </button>
      )}
    </>
  );
}

function toMedia(result: UploadedFileResult): UploadedMedia {
  return {
    url: result.url,
    publicId: result.publicId,
    resourceType: result.resourceType,
  };
}

function padSlots<T>(slots: (T | null)[], max: number) {
  const next = [...slots];
  while (next.length < max) next.push(null);
  return next.slice(0, max);
}

export function VendorMediaFields({
  avatarUrl,
  coverImageUrl,
  featuredImages,
  featuredClips = [],
  onAvatarChange,
  onCoverChange,
  onFeaturedChange,
  onClipsChange,
  title = "Photos & media",
  description = "Add a profile image, cover banner, up to seven featured photos, and optional video clips customers can browse before booking.",
  showFeatured = true,
  showClips: showClipsProp,
  showProfile = true,
}: {
  avatarUrl: string | null;
  coverImageUrl: string | null;
  featuredImages: (FeaturedImage | null)[];
  featuredClips?: (FeaturedClip | null)[];
  onAvatarChange: (url: string | null) => void;
  onCoverChange: (url: string | null) => void;
  onFeaturedChange: (images: (FeaturedImage | null)[]) => void;
  onClipsChange?: (clips: (FeaturedClip | null)[]) => void;
  title?: string;
  description?: string;
  showFeatured?: boolean;
  showClips?: boolean;
  showProfile?: boolean;
}) {
  const { data: cloudinaryReady } = useQuery({
    queryKey: ["cloudinary-status"],
    queryFn: isCloudinaryUploadReady,
  });

  const filledCount = featuredImages.filter(Boolean).length;
  const clipCount = featuredClips.filter(Boolean).length;
  const disabled = !cloudinaryReady;
  const showClipsSection = showClipsProp ?? Boolean(onClipsChange);

  function updateFeatured(index: number, next: FeaturedImage | null) {
    const slots = padSlots(featuredImages, MAX_FEATURED_IMAGES);
    slots[index] = next;
    onFeaturedChange(slots);
  }

  function updateClip(index: number, next: FeaturedClip | null) {
    if (!onClipsChange) return;
    const slots = padSlots(featuredClips, MAX_FEATURED_CLIPS);
    slots[index] = next;
    onClipsChange(slots);
  }

  const imageSlots = padSlots(featuredImages, MAX_FEATURED_IMAGES);
  const clipSlots = padSlots(featuredClips, MAX_FEATURED_CLIPS);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {showProfile && (
      <div className="grid gap-6 sm:grid-cols-2">
        <ImageUploadField
          label="Profile image"
          value={avatarUrl}
          onChange={onAvatarChange}
          aspect="square"
          uploadPurpose="profile"
          disabled={disabled}
        />
        <ImageUploadField
          label="Cover photo"
          value={coverImageUrl}
          onChange={onCoverChange}
          aspect="cover"
          uploadPurpose="portfolio"
          disabled={disabled}
        />
      </div>
      )}

      {showFeatured && (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">
            Featured photos ({filledCount}/{MAX_FEATURED_IMAGES})
          </p>
          <p className="text-xs text-muted-foreground">Showcase your best work</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {imageSlots.map((img, i) => (
            <FeaturedSlot
              key={i}
              index={i}
              value={img}
              onChange={(next) => updateFeatured(i, next)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
      )}

      {showClipsSection && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">
              Video clips ({clipCount}/{MAX_FEATURED_CLIPS})
            </p>
            <p className="text-xs text-muted-foreground">MP4, MOV, or WebM · max 50MB each</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {clipSlots.map((clip, i) => (
              <ClipSlot
                key={i}
                index={i}
                value={clip}
                onChange={(next) => updateClip(i, next)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** @deprecated Use VendorMediaFields */
export const VenuePhotosFields = VendorMediaFields;

export { featuredImagesPayload, featuredClipsPayload } from "@/lib/vendor-media";
