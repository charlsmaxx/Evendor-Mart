"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload, X, Crop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isCloudinaryUploadReady, uploadFileToCloudinary, type UploadPurpose } from "@/lib/upload-client";
import { useQuery } from "@tanstack/react-query";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { type CropAspectKey } from "@/lib/image-crop";
import { reportClientError } from "@/lib/client-error";

type ImageUploadFieldProps = {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  aspect?: CropAspectKey;
  uploadPurpose?: UploadPurpose;
  disabled?: boolean;
};

const PREVIEW_CLASS: Record<CropAspectKey, string> = {
  square: "aspect-square max-w-[140px]",
  cover: "aspect-[3/1]",
  listing: "aspect-[16/10]",
};

export function ImageUploadField({
  label,
  value,
  onChange,
  aspect = "square",
  uploadPurpose = "profile",
  disabled,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const { data: cloudinaryReady } = useQuery({
    queryKey: ["cloudinary-status"],
    queryFn: isCloudinaryUploadReady,
  });

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const result = await uploadFileToCloudinary(file, uploadPurpose);
      onChange(result.url);
    } catch (e) {
      reportClientError("upload", e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onFileSelected(file: File) {
    if (file.size > 8 * 1024 * 1024) {
      reportClientError("upload", "Image must be under 8MB");
      return;
    }
    setCropFile(file);
    setCropOpen(true);
  }

  const previewClass = PREVIEW_CLASS[aspect];

  return (
    <>
      <div className="space-y-2">
        <p className="text-sm font-medium">{label}</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelected(file);
          }}
        />
        {value ? (
          <div className={`relative overflow-hidden rounded-xl border border-border ${previewClass}`}>
            <Image src={value} alt={label} fill className="object-cover" sizes="400px" />
            <div className="absolute right-2 top-2 flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={disabled || !cloudinaryReady}
                onClick={() => inputRef.current?.click()}
                title="Change photo"
              >
                <Crop className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={disabled}
                onClick={() => onChange(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled || uploading || !cloudinaryReady}
            onClick={() => inputRef.current?.click()}
            className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground transition hover:border-primary/40 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50 ${previewClass}`}
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                {cloudinaryReady ? "Upload & crop" : "Upload unavailable"}
              </>
            )}
          </button>
        )}
        <p className="text-xs text-muted-foreground">JPG, PNG, or WebP · crop before upload</p>
      </div>

      <ImageCropDialog
        open={cropOpen}
        file={cropFile}
        aspect={aspect}
        title={`Crop ${label.toLowerCase()}`}
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
