"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadFileToCloudinary, type UploadedFileResult } from "@/lib/upload-client";
import { reportClientError } from "@/lib/client-error";

export type VerificationDocument = UploadedFileResult & {
  label: string;
};

type DocumentUploadSlotProps = {
  label: string;
  description: string;
  accept?: string;
  value: VerificationDocument | null;
  onChange: (doc: VerificationDocument | null) => void;
  disabled?: boolean;
  cloudinaryReady: boolean;
};

export function DocumentUploadSlot({
  label,
  description,
  accept = "image/jpeg,image/png,image/webp,application/pdf",
  value,
  onChange,
  disabled,
  cloudinaryReady,
}: DocumentUploadSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    const maxMb = 10;
    if (file.size > maxMb * 1024 * 1024) {
      reportClientError("verification-upload", `File must be under ${maxMb}MB`);
      return;
    }

    setUploading(true);
    try {
      const result = await uploadFileToCloudinary(file, "verification");
      onChange({ ...result, label });
    } catch (e) {
      reportClientError("verification-upload", e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const isImage = value?.resourceType === "image" || value?.url.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i);

  return (
    <div className="rounded-xl border border-border/80 bg-background/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-muted-foreground hover:text-destructive"
            title="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {value ? (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
          {isImage ? (
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
              <Image src={value.url} alt={label} fill className="object-cover" sizes="56px" />
            </div>
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-emerald-800">Uploaded</p>
            <p className="truncate text-xs text-emerald-700/80">{value.fileName}</p>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 w-full gap-2"
          disabled={disabled || uploading || !cloudinaryReady}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" /> Choose file from device
            </>
          )}
        </Button>
      )}

      <p className="mt-2 text-[10px] text-muted-foreground">JPG, PNG, WebP, or PDF · max 10MB</p>
    </div>
  );
}

type MultiDocumentUploadProps = {
  label: string;
  description: string;
  minCount?: number;
  values: VerificationDocument[];
  onChange: (docs: VerificationDocument[]) => void;
  disabled?: boolean;
  cloudinaryReady: boolean;
};

export function MultiDocumentUpload({
  label,
  description,
  minCount = 1,
  values,
  onChange,
  disabled,
  cloudinaryReady,
}: MultiDocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setUploading(true);
    try {
      const uploaded: VerificationDocument[] = [];
      for (const file of Array.from(fileList)) {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`${file.name} exceeds 10MB limit`);
        }
        const result = await uploadFileToCloudinary(file, "verification");
        uploaded.push({ ...result, label });
      }
      onChange([...values, ...uploaded]);
    } catch (e) {
      reportClientError("verification-upload", e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-xl border border-border/80 bg-background/50 p-4">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">
        {description}
        {minCount > 1 ? ` · at least ${minCount} recommended` : ""}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 gap-2"
        disabled={disabled || uploading || !cloudinaryReady || values.length >= 10}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" /> Add photos from device
          </>
        )}
      </Button>

      {values.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {values.map((doc, i) => (
            <div key={doc.publicId} className="group relative aspect-square overflow-hidden rounded-lg border">
              <Image src={doc.url} alt="" fill className="object-cover" sizes="120px" />
              <button
                type="button"
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
