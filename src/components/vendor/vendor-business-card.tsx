"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Download, Search, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCategoryLabel } from "@/lib/categories";
import { reportClientError } from "@/lib/client-error";
import {
  BUSINESS_CARD_HEADLINE_LINE_1,
  BUSINESS_CARD_HEADLINE_LINE_2,
  BUSINESS_CARD_IMAGE,
  BUSINESS_CARD_LAYOUT,
  BUSINESS_CARD_SIZE,
  vendorCardHandle,
} from "@/lib/vendor-business-card";

export type VendorBusinessCardProps = {
  businessName: string;
  category: string;
  slug: string;
  avatarUrl: string | null;
};

function loadImage(src: string, cors = false) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

async function loadAvatar(url: string) {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("avatar fetch failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      return await loadImage(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return loadImage(url, true);
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawSearchIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const r = size * 0.32;
  ctx.strokeStyle = "#7A2E3D";
  ctx.lineWidth = Math.max(4, size * 0.08);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx - size * 0.08, cy - size * 0.08, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.45, cy + r * 0.45);
  ctx.lineTo(cx + size * 0.38, cy + size * 0.38);
  ctx.stroke();
}

async function renderBusinessCardPng(input: {
  avatarUrl: string;
  handle: string;
  category: string;
}) {
  const size = BUSINESS_CARD_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const bg = await loadImage(encodeURI(BUSINESS_CARD_IMAGE));
  ctx.drawImage(bg, 0, 0, size, size);

  const avatar = BUSINESS_CARD_LAYOUT.avatar;
  const avatarD = avatar.diameter * size;
  const avatarX = (size - avatarD) / 2;
  const avatarY = avatar.top * size;
  const cx = size / 2;
  const cy = avatarY + avatarD / 2;

  ctx.fillStyle = "#7A2E3D";
  ctx.beginPath();
  ctx.arc(cx, cy, avatarD / 2 + 6, 0, Math.PI * 2);
  ctx.fill();

  const avatarImg = await loadAvatar(input.avatarUrl);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, avatarD / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(avatarImg, avatarX, avatarY, avatarD, avatarD);
  ctx.restore();

  const pill = BUSINESS_CARD_LAYOUT.pill;
  const pillW = size * (1 - pill.left * 2);
  const pillH = pill.height * size;
  const pillX = pill.left * size;
  const pillY = size - pill.bottom * size - pillH;

  ctx.fillStyle = "#F3EEE6";
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();

  const iconSize = pillH * 0.42;
  const iconCx = pillX + pillH * 0.48;
  const iconCy = pillY + pillH / 2;
  drawSearchIcon(ctx, iconCx, iconCy, iconSize);

  const textX = pillX + pillH * 0.92;
  const maxTextW = pillW - pillH * 1.15;

  let handleSize = Math.round(size * 0.038);
  ctx.fillStyle = "#5C2A34";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${handleSize}px ui-sans-serif, system-ui, sans-serif`;
  while (handleSize > 22 && ctx.measureText(input.handle).width > maxTextW) {
    handleSize -= 1;
    ctx.font = `700 ${handleSize}px ui-sans-serif, system-ui, sans-serif`;
  }
  ctx.fillText(input.handle, textX, pillY + pillH * 0.42, maxTextW);

  const catSize = Math.round(size * 0.022);
  ctx.font = `600 ${catSize}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(input.category, textX, pillY + pillH * 0.68, maxTextW);

  const headline = BUSINESS_CARD_LAYOUT.headline;
  const headlineY = headline.top * size;
  const headlineH = headline.height * size;
  ctx.fillStyle = "#661721";
  ctx.fillRect(0, headlineY, size, headlineH);

  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `500 ${Math.round(size * 0.042)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(BUSINESS_CARD_HEADLINE_LINE_1, size / 2, headlineY + headlineH * 0.36);
  ctx.font = `700 ${Math.round(size * 0.05)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(BUSINESS_CARD_HEADLINE_LINE_2, size / 2, headlineY + headlineH * 0.7);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not create image"));
    }, "image/png");
  });
}

export function VendorBusinessCard({
  businessName,
  category,
  slug,
  avatarUrl,
}: VendorBusinessCardProps) {
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const handle = vendorCardHandle(slug, businessName);
  const categoryLabel = getCategoryLabel(category).toUpperCase();
  const hasPhoto = Boolean(avatarUrl);
  const profileUrl =
    typeof window === "undefined" ? `/vendors/${slug}` : `${window.location.origin}/vendors/${slug}`;

  async function buildFile() {
    if (!avatarUrl) throw new Error("Add a profile picture first.");
    const blob = await renderBusinessCardPng({
      avatarUrl,
      handle,
      category: categoryLabel,
    });
    return new File([blob], `evendor-${slug}-business-card.png`, { type: "image/png" });
  }

  function requirePhoto() {
    setActionError("Add a profile picture before downloading or sharing your business card.");
  }

  async function onDownload() {
    if (!hasPhoto) {
      requirePhoto();
      return;
    }
    setBusy("download");
    setActionError(null);
    try {
      const file = await buildFile();
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not download card.";
      setActionError(message);
      reportClientError("business-card", message);
    } finally {
      setBusy(null);
    }
  }

  async function onShare() {
    if (!hasPhoto) {
      requirePhoto();
      return;
    }
    setBusy("share");
    setActionError(null);
    try {
      const file = await buildFile();
      const text = `You can find me on evendor.ng. ${handle} · ${profileUrl}`;
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };
      if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await nav.share({
          title: `${businessName} on Evendor`,
          text,
          files: [file],
        });
        return;
      }
      if (nav.share) {
        await nav.share({ title: `${businessName} on Evendor`, text, url: profileUrl });
        return;
      }
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      const message = e instanceof Error ? e.message : "Could not share card.";
      setActionError(message);
      reportClientError("business-card", message);
    } finally {
      setBusy(null);
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `You can find me on evendor.ng — ${handle}\n${profileUrl}`
  )}`;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h2 className="font-display text-lg font-semibold">Your Evendor business card</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Download and share this card on Instagram, WhatsApp, Facebook, and other social platforms.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-center">
        <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl shadow-md">
          <Image
            src={BUSINESS_CARD_IMAGE}
            alt="Evendor business card"
            fill
            sizes="(max-width: 768px) 100vw, 384px"
            className="object-cover"
            priority={false}
          />
          <div
            className="absolute overflow-hidden rounded-full bg-[#7A2E3D] shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
            style={{
              top: `${BUSINESS_CARD_LAYOUT.avatar.top * 100}%`,
              left: "50%",
              width: `${BUSINESS_CARD_LAYOUT.avatar.diameter * 100}%`,
              height: `${BUSINESS_CARD_LAYOUT.avatar.diameter * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt={businessName} fill className="object-cover" sizes="200px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-white/90">
                {businessName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div
            className="absolute left-0 right-0 flex flex-col items-center justify-center text-center text-white"
            style={{
              top: `${BUSINESS_CARD_LAYOUT.headline.top * 100}%`,
              height: `${BUSINESS_CARD_LAYOUT.headline.height * 100}%`,
              background: "#661721",
            }}
          >
            <p className="text-[clamp(0.85rem,4.1vw,1.2rem)] font-medium leading-tight">
              {BUSINESS_CARD_HEADLINE_LINE_1}
            </p>
            <p className="mt-[0.15em] text-[clamp(1rem,4.8vw,1.4rem)] font-bold leading-tight">
              {BUSINESS_CARD_HEADLINE_LINE_2}
            </p>
          </div>
          <div
            className="absolute flex items-center gap-[3.5%] rounded-full bg-[#F3EEE6] px-[4.5%]"
            style={{
              left: `${BUSINESS_CARD_LAYOUT.pill.left * 100}%`,
              right: `${BUSINESS_CARD_LAYOUT.pill.left * 100}%`,
              bottom: `${BUSINESS_CARD_LAYOUT.pill.bottom * 100}%`,
              height: `${BUSINESS_CARD_LAYOUT.pill.height * 100}%`,
            }}
          >
            <Search className="h-[38%] w-auto shrink-0 text-[#7A2E3D]" strokeWidth={2.4} aria-hidden />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[clamp(0.7rem,3.6vw,1.05rem)] font-bold text-[#5C2A34]">
                {handle}
              </p>
              <p className="truncate text-[clamp(0.5rem,2.2vw,0.7rem)] font-semibold uppercase tracking-wide text-[#5C2A34]">
                {categoryLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {!hasPhoto && (
            <div
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
              role="status"
            >
              <p className="font-medium">Add a profile picture to download your card.</p>
              <p className="mt-1 text-amber-900/80">
                Your photo appears at the top of the card. Upload one, then come back to download or share.
              </p>
              <Button variant="gradient" size="sm" className="mt-3" asChild>
                <Link href="/account">Add profile picture</Link>
              </Button>
            </div>
          )}
          {actionError ? (
            <p className="text-sm text-destructive" role="alert">
              {actionError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="gradient"
              className="gap-2"
              onClick={onDownload}
              disabled={busy !== null || !hasPhoto}
            >
              <Download className="h-4 w-4" />
              {busy === "download" ? "Preparing…" : "Download card"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={onShare}
              disabled={busy !== null || !hasPhoto}
            >
              <Share2 className="h-4 w-4" />
              {busy === "share" ? "Opening…" : "Share"}
            </Button>
            <Button variant="outline" asChild>
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                Share on WhatsApp
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            For Instagram or Facebook, download the card, then upload it to your post or story.
          </p>
        </div>
      </div>
    </section>
  );
}
