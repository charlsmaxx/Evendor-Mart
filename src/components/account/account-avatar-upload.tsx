"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { isCloudinaryUploadReady, uploadFileToCloudinary } from "@/lib/upload-client";
import { reportClientError } from "@/lib/client-error";
import { cn } from "@/lib/utils";

type AccountAvatarUploadProps = {
  value: string | null;
  onChange: (url: string | null) => void;
  name?: string;
  disabled?: boolean;
};

export function AccountAvatarUpload({
  value,
  onChange,
  name = "You",
  disabled,
}: AccountAvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const { data: cloudinaryReady } = useQuery({
    queryKey: ["cloudinary-status"],
    queryFn: isCloudinaryUploadReady,
  });

  const initial = name.trim().charAt(0).toUpperCase() || "U";

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const result = await uploadFileToCloudinary(file, "profile");
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

  return (
    <>
      <div className="flex flex-col items-center gap-2">
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

        <div className="relative h-28 w-28">
          <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-primary/20 bg-primary/10 shadow-sm">
            {value ? (
              <Image src={value} alt={name} fill className="object-cover" sizes="112px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-primary">
                {initial}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={disabled || uploading || !cloudinaryReady}
            onClick={() => inputRef.current?.click()}
            aria-label="Change profile photo"
            title={cloudinaryReady ? "Change photo" : "Upload unavailable"}
            className={cn(
              "absolute bottom-0 left-1/2 z-10 flex h-9 w-9 -translate-x-1/2 translate-y-1/4 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-md transition hover:bg-primary/90",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">Tap the camera to change photo</p>
      </div>

      <ImageCropDialog
        open={cropOpen}
        file={cropFile}
        aspect="square"
        title="Crop profile photo"
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
