"use client";

import Image from "next/image";
import { FileText } from "lucide-react";
import { EvidenceLink } from "@/components/vendor/evidence-file-upload";

type EvidenceItem = {
  id: string;
  url: string;
  caption?: string | null;
  createdAt: string;
  uploadedBy?: { fullName?: string | null; email?: string } | null;
};

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url) || url.includes("/image/upload/");
}

export function DisputeEvidenceGallery({ evidence }: { evidence: EvidenceItem[] }) {
  if (!evidence.length) {
    return <p className="text-sm text-muted-foreground">No evidence uploaded yet.</p>;
  }

  const images = evidence.filter((e) => isImageUrl(e.url));
  const files = evidence.filter((e) => !isImageUrl(e.url));

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="group relative aspect-square overflow-hidden rounded-xl border border-border"
            >
              <Image
                src={item.url}
                alt={item.caption ?? "Dispute evidence"}
                fill
                className="object-cover transition group-hover:scale-105"
                sizes="160px"
              />
              {item.caption && (
                <span className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-[10px] text-white line-clamp-2">
                  {item.caption}
                </span>
              )}
            </a>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((item) => (
            <EvidenceLink key={item.id} url={item.url} />
          ))}
        </div>
      )}
      <ul className="space-y-1 text-xs text-muted-foreground">
        {evidence.map((item) => (
          <li key={`meta-${item.id}`} className="flex items-center gap-1">
            <FileText className="h-3 w-3 shrink-0" />
            {item.uploadedBy?.fullName ?? item.uploadedBy?.email ?? "User"} ·{" "}
            {new Date(item.createdAt).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
