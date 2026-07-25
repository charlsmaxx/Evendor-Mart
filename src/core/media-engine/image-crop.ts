export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CropState = {
  panX: number;
  panY: number;
  zoom: number;
};

export const ASPECT_RATIOS = {
  square: 1,
  cover: 3,
  listing: 16 / 10,
} as const;

export type CropAspectKey = keyof typeof ASPECT_RATIOS;

export function getBaseScale(
  imageWidth: number,
  imageHeight: number,
  cropWidth: number,
  cropHeight: number
) {
  return Math.max(cropWidth / imageWidth, cropHeight / imageHeight);
}

/** Map visible crop window to source pixels in the original image. */
export function computeCropArea(
  imageWidth: number,
  imageHeight: number,
  cropWidth: number,
  cropHeight: number,
  state: CropState
): CropArea {
  const baseScale = getBaseScale(imageWidth, imageHeight, cropWidth, cropHeight);
  const scale = baseScale * state.zoom;
  const displayedWidth = imageWidth * scale;
  const displayedHeight = imageHeight * scale;

  const offsetX = (cropWidth - displayedWidth) / 2 + state.panX;
  const offsetY = (cropHeight - displayedHeight) / 2 + state.panY;

  let x = -offsetX / scale;
  let y = -offsetY / scale;
  let width = cropWidth / scale;
  let height = cropHeight / scale;

  x = Math.max(0, Math.min(x, imageWidth - 1));
  y = Math.max(0, Math.min(y, imageHeight - 1));
  width = Math.min(width, imageWidth - x);
  height = Math.min(height, imageHeight - y);

  return { x, y, width, height };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function cropImageToBlob(
  imageSrc: string,
  area: CropArea,
  outputWidth: number,
  outputHeight: number,
  mimeType = "image/jpeg",
  quality = 0.92
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))),
      mimeType,
      quality
    );
  });
}

export async function cropImageToFile(
  imageSrc: string,
  area: CropArea,
  outputWidth: number,
  outputHeight: number,
  fileName: string
): Promise<File> {
  const blob = await cropImageToBlob(imageSrc, area, outputWidth, outputHeight);
  return new File([blob], fileName, { type: blob.type });
}

export function outputSizeForAspect(aspect: CropAspectKey): { width: number; height: number } {
  switch (aspect) {
    case "square":
      return { width: 512, height: 512 };
    case "cover":
      return { width: 1200, height: 400 };
    case "listing":
      return { width: 1600, height: 1000 };
  }
}
