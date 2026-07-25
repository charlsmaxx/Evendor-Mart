export async function getChatUploadSignature(
  conversationId: string,
  resourceType: "image" | "raw" = "image"
) {
  const res = await fetch("/api/messages/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId, resourceType }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message ?? "Could not prepare upload");
  }
  return json.data as {
    signature: string;
    timestamp: number;
    cloudName: string;
    apiKey: string;
    folder: string;
    resourceType: "image" | "raw";
  };
}

async function uploadToCloudinary(
  conversationId: string,
  file: File,
  resourceType: "image" | "raw"
) {
  const sig = await getChatUploadSignature(conversationId, resourceType);
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloudName}/${resourceType}/upload`,
    { method: "POST", body: form }
  );
  const uploadJson = await uploadRes.json();
  if (!uploadRes.ok) {
    throw new Error(uploadJson.error?.message ?? "Upload failed");
  }

  return {
    mediaUrl: uploadJson.secure_url as string,
    mediaPublicId: uploadJson.public_id as string,
  };
}

export async function uploadChatImage(conversationId: string, file: File) {
  return uploadToCloudinary(conversationId, file, "image");
}

const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

export function isChatDocument(file: File) {
  return DOCUMENT_TYPES.has(file.type);
}

export async function uploadChatDocument(conversationId: string, file: File) {
  if (!isChatDocument(file)) {
    throw new Error("Unsupported document type. Use PDF, Word, Excel, or plain text.");
  }
  return uploadToCloudinary(conversationId, file, "raw");
}
