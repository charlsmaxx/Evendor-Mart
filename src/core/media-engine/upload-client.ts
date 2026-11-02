export type CloudinarySignPayload = {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  folder: string;
};

export type UploadedFileResult = {
  url: string;
  publicId: string;
  fileName: string;
  resourceType: string;
};

const UPSCALE_BELOW_PIXELS = 1_000_000;

function shouldUpscaleImage(upload: {
  width?: number;
  height?: number;
  format?: string;
  pages?: number;
}, purpose: UploadPurpose, enhanceLowResolution: boolean): boolean {
  const allowedFormat = ["jpg", "jpeg", "png", "webp"].includes(
    upload.format?.toLowerCase() ?? ""
  );
  return (
    enhanceLowResolution &&
    (purpose === "profile" || purpose === "portfolio") &&
    allowedFormat &&
    (!upload.pages || upload.pages === 1) &&
    Number.isFinite(upload.width) &&
    Number.isFinite(upload.height) &&
    (upload.width ?? 0) > 0 &&
    (upload.height ?? 0) > 0 &&
    (upload.width ?? Infinity) <= 2048 &&
    (upload.height ?? Infinity) <= 2048 &&
    (upload.width ?? 0) * (upload.height ?? 0) < UPSCALE_BELOW_PIXELS
  );
}

function withCloudinaryUpscale(url: string): string {
  return url.replace("/image/upload/", "/image/upload/e_upscale/");
}

function loadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = url;
  });
}

async function readyUpscaledUrl(originalUrl: string): Promise<string> {
  const enhancedUrl = withCloudinaryUpscale(originalUrl);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (await loadImage(enhancedUrl)) return enhancedUrl;
    if (attempt < 5) {
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  // A Cloudinary transformation issue should not prevent an image upload from succeeding.
  return originalUrl;
}

export async function isCloudinaryUploadReady(): Promise<boolean> {
  const res = await fetch("/api/upload/sign");
  const json = await res.json();
  return json.data?.configured === true;
}

export type UploadPurpose = "portfolio" | "verification" | "profile" | "evidence" | "booking";

export async function getUploadSignature(purpose: UploadPurpose = "portfolio") {
  const res = await fetch("/api/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose }),
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message ?? "Upload is unavailable");
  }
  return json.data as CloudinarySignPayload;
}

function uploadEndpoint(cloudName: string, file: File): string {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isVideo = file.type.startsWith("video/");
  const resource = isPdf ? "raw" : isVideo ? "video" : file.type.startsWith("image/") ? "image" : "auto";
  return `https://api.cloudinary.com/v1_1/${cloudName}/${resource}/upload`;
}

export async function uploadFileToCloudinary(
  file: File,
  purpose: UploadPurpose = "portfolio",
  enhanceLowResolution = false
): Promise<UploadedFileResult> {
  const sig = await getUploadSignature(purpose);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", sig.apiKey);
  formData.append("timestamp", String(sig.timestamp));
  formData.append("signature", sig.signature);
  formData.append("folder", sig.folder);

  const uploadRes = await fetch(uploadEndpoint(sig.cloudName, file), {
    method: "POST",
    body: formData,
  });
  const uploadJson = await uploadRes.json();
  if (!uploadRes.ok) {
    throw new Error(uploadJson.error?.message ?? "Upload failed");
  }

  const originalUrl = uploadJson.secure_url as string;
  const url = shouldUpscaleImage(uploadJson, purpose, enhanceLowResolution)
    ? await readyUpscaledUrl(originalUrl)
    : originalUrl;

  return {
    url,
    publicId: uploadJson.public_id as string,
    fileName: file.name,
    resourceType: uploadJson.resource_type ?? "image",
  };
}
