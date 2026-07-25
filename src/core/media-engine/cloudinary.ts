import { v2 as cloudinary } from "cloudinary";

const PLACEHOLDER_PATTERNS = [
  /^your-/i,
  /^xxx$/i,
  /^\[.*\]$/,
  /^change-me/i,
];

function isPlaceholder(value: string | undefined) {
  if (!value?.trim()) return true;
  return PLACEHOLDER_PATTERNS.some((p) => p.test(value.trim()));
}

export function isCloudinaryConfigured() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  return !(
    isPlaceholder(cloudName) ||
    isPlaceholder(apiKey) ||
    isPlaceholder(apiSecret)
  );
}

export function configureCloudinary() {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured");
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!.trim(),
    api_key: process.env.CLOUDINARY_API_KEY!.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET!.trim(),
    secure: true,
  });
  return cloudinary;
}

export function getUploadSignature(folder: string) {
  configureCloudinary();
  const timestamp = Math.round(Date.now() / 1000);
  // Only sign params that are also sent in the browser upload FormData.
  const params = { folder, timestamp };
  const apiSecret = process.env.CLOUDINARY_API_SECRET!.trim();
  const signature = cloudinary.utils.api_sign_request(params, apiSecret);
  return {
    signature,
    timestamp,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!.trim(),
    apiKey: process.env.CLOUDINARY_API_KEY!.trim(),
    folder,
  };
}
