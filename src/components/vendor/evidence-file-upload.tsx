"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { FileText, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadFileToCloudinary, isCloudinaryUploadReady } from "@/lib/upload-client";
import { useQuery } from "@tanstack/react-query";
import { reportClientError } from "@/lib/client-error";

type EvidenceFileUploadProps = {
  label?: string;
  purpose: "evidence" | "booking";
  onUploaded: (result: { url: string; publicId: string }) => void;
  disabled?: boolean;
  accept?: string;
};

export function EvidenceFileUpload({
  label = "Upload from device",
  purpose,
  onUploaded,
  disabled,
  accept = "image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime",
}: EvidenceFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const { data: cloudinaryReady } = useQuery({
    queryKey: ["cloudinary-status"],
    queryFn: isCloudinaryUploadReady,
  });

  async function handleFile(file: File) {
    if (file.size > 15 * 1024 * 1024) {
      reportClientError("evidence-upload", "File must be under 15MB");
      return;
    }
    setUploading(true);
    try {
      const result = await uploadFileToCloudinary(file, purpose);
      if (result.resourceType === "image") setPreview(result.url);
      onUploaded({ url: result.url, publicId: result.publicId });
    } catch (e) {
      reportClientError("evidence-upload", e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1.5"
        disabled={disabled || uploading || !cloudinaryReady}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
          </>
        ) : (
          <>
            <Upload className="h-3.5 w-3.5" /> {label}
          </>
        )}
      </Button>
      {!cloudinaryReady && (
        <p className="text-xs text-muted-foreground">Configure Cloudinary to enable uploads.</p>
      )}
      {preview && (
        <div className="relative mt-2 h-20 w-32 overflow-hidden rounded-lg border">
          <Image src={preview} alt="Evidence preview" fill className="object-cover" sizes="128px" />
        </div>
      )}
    </div>
  );
}

export function EvidenceLink({ url }: { url: string }) {
  const isImage = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url) || url.includes("/image/upload/");
  const isPdf = url.toLowerCase().includes(".pdf") || url.includes("/raw/upload/");

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-primary hover:bg-muted/50"
    >
      {isImage ? (
        <span className="truncate max-w-[120px]">Photo</span>
      ) : isPdf ? (
        <>
          <FileText className="h-3 w-3" /> PDF
        </>
      ) : (
        <span>File</span>
      )}
    </a>
  );
}
