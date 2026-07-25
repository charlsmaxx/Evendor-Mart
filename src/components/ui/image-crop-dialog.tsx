"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ASPECT_RATIOS,
  computeCropArea,
  cropImageToFile,
  loadImage,
  outputSizeForAspect,
  type CropAspectKey,
  type CropState,
} from "@/lib/image-crop";

type ImageCropDialogProps = {
  open: boolean;
  file: File | null;
  aspect: CropAspectKey;
  title?: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

const CROP_WIDTH = 320;

export function ImageCropDialog({
  open,
  file,
  aspect,
  title = "Crop image",
  onCancel,
  onConfirm,
}: ImageCropDialogProps) {
  const ratio = ASPECT_RATIOS[aspect];
  const cropHeight = Math.round(CROP_WIDTH / ratio);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [state, setState] = useState<CropState>({ panX: 0, panY: 0, zoom: 1 });
  const [processing, setProcessing] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(
    null
  );

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setState({ panX: 0, panY: 0, zoom: 1 });
    loadImage(url).then((img) => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = { startX: e.clientX, startY: e.clientY, panX: state.panX, panY: state.panY };
    },
    [state.panX, state.panY]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setState((s) => ({
      ...s,
      panX: dragRef.current!.panX + (e.clientX - dragRef.current!.startX),
      panY: dragRef.current!.panY + (e.clientY - dragRef.current!.startY),
    }));
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  async function handleConfirm() {
    if (!previewUrl || !file || !imageSize.width) return;
    setProcessing(true);
    try {
      const area = computeCropArea(
        imageSize.width,
        imageSize.height,
        CROP_WIDTH,
        cropHeight,
        state
      );
      const { width, height } = outputSizeForAspect(aspect);
      const cropped = await cropImageToFile(
        previewUrl,
        area,
        width,
        height,
        file.name.replace(/\.\w+$/, ".jpg")
      );
      onConfirm(cropped);
    } finally {
      setProcessing(false);
    }
  }

  if (!open || !file || !previewUrl) return null;

  const baseScale = imageSize.width
    ? getDisplayScale(imageSize.width, imageSize.height, CROP_WIDTH, cropHeight, state.zoom)
    : 1;
  const displayedWidth = imageSize.width * baseScale;
  const displayedHeight = imageSize.height * baseScale;
  const offsetX = (CROP_WIDTH - displayedWidth) / 2 + state.panX;
  const offsetY = (cropHeight - displayedHeight) / 2 + state.panY;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-label="Close crop dialog"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h3 className="font-display text-lg font-bold">{title}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Move className="h-3.5 w-3.5" /> Drag to reposition · zoom to adjust
        </p>

        <div
          className="relative mx-auto mt-4 overflow-hidden rounded-xl border-2 border-primary/40 bg-muted"
          style={{ width: CROP_WIDTH, height: cropHeight }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Crop preview"
            draggable={false}
            className="absolute max-w-none select-none touch-none"
            style={{
              width: displayedWidth,
              height: displayedHeight,
              left: offsetX,
              top: offsetY,
            }}
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <ZoomOut className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={state.zoom}
            onChange={(e) => setState((s) => ({ ...s, zoom: Number(e.target.value) }))}
            className="w-full"
          />
          <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>

        <div className="mt-6 flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="gradient"
            className="flex-1"
            disabled={processing || !imageSize.width}
            onClick={handleConfirm}
          >
            {processing ? "Processing…" : "Apply crop"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function getDisplayScale(
  imageWidth: number,
  imageHeight: number,
  cropWidth: number,
  cropHeight: number,
  zoom: number
) {
  const base = Math.max(cropWidth / imageWidth, cropHeight / imageHeight);
  return base * zoom;
}
