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
  purpose: UploadPurpose = "portfolio"
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

  return {
    url: uploadJson.secure_url as string,
    publicId: uploadJson.public_id as string,
    fileName: file.name,
    resourceType: uploadJson.resource_type ?? "image",
  };
}
