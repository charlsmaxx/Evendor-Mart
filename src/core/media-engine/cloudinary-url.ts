/** Delivery transforms for Cloudinary URLs — f_auto (WebP/AVIF), q_auto, size presets. */

export type ImagePreset =
  | "card"
  | "hero"
  | "thumb"
  | "avatar"
  | "avatarSm"
  | "chat"
  | "portfolio"
  | "cover";

type PresetConfig = {
  width?: number;
  height?: number;
  crop?: "fill" | "limit" | "fit" | "scale";
  gravity?: string;
};

const BASE_DELIVERY = ["f_auto", "q_auto", "dpr_auto"] as const;

const PRESETS: Record<ImagePreset, PresetConfig> = {
  card: { width: 640, height: 480, crop: "fill", gravity: "auto" },
  hero: { width: 1600, height: 900, crop: "fill", gravity: "auto" },
  thumb: { width: 192, height: 128, crop: "fill", gravity: "auto" },
  avatar: { width: 128, height: 128, crop: "fill", gravity: "face" },
  avatarSm: { width: 48, height: 48, crop: "fill", gravity: "face" },
  chat: { width: 640, crop: "limit" },
  portfolio: { width: 800, height: 600, crop: "fill", gravity: "auto" },
  cover: { width: 1200, height: 400, crop: "fill", gravity: "auto" },
};

const CLOUDINARY_UPLOAD_RE =
  /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video)\/upload\/)(.+)$/i;

export function isCloudinaryDeliveryUrl(url: string): boolean {
  return url.includes("res.cloudinary.com") && url.includes("/upload/");
}

function buildTransformString(config: PresetConfig): string {
  const parts: string[] = [...BASE_DELIVERY];
  if (config.width) parts.push(`w_${config.width}`);
  if (config.height) parts.push(`h_${config.height}`);
  if (config.crop) parts.push(`c_${config.crop}`);
  if (config.gravity) parts.push(`g_${config.gravity}`);
  return parts.join(",");
}

/** Inject delivery transforms on a Cloudinary asset URL (prepended so preset dimensions win). */
export function applyCloudinaryTransform(url: string, transform: string): string {
  if (!isCloudinaryDeliveryUrl(url)) return url;

  const match = url.match(CLOUDINARY_UPLOAD_RE);
  if (!match) return url;

  const [, prefix, suffix] = match;
  if (suffix.startsWith(`${transform}/`)) return url;

  return `${prefix}${transform}/${suffix}`;
}

export type OptimizeImageOptions = {
  preset?: ImagePreset;
  width?: number;
  height?: number;
  crop?: PresetConfig["crop"];
  gravity?: string;
};

/** Return a bandwidth-friendly Cloudinary URL, or the original URL for non-Cloudinary assets. */
export function optimizeImageUrl(
  url: string | null | undefined,
  options: OptimizeImageOptions = {}
): string {
  if (!url?.trim()) return url ?? "";

  if (!isCloudinaryDeliveryUrl(url)) return url;

  const presetConfig = options.preset ? PRESETS[options.preset] : {};
  const transform = buildTransformString({
    width: options.width ?? presetConfig.width,
    height: options.height ?? presetConfig.height,
    crop: options.crop ?? presetConfig.crop,
    gravity: options.gravity ?? presetConfig.gravity,
  });

  return applyCloudinaryTransform(url, transform);
}

/** Batch-optimize gallery URLs with a shared preset. */
export function optimizeImageUrls(
  urls: string[],
  options: OptimizeImageOptions = {}
): string[] {
  return urls.map((url) => optimizeImageUrl(url, options));
}
