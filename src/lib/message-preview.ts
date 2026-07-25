export type MessagePreviewInput = {
  body: string;
  type: string;
  mediaUrl?: string | null;
};

export function messagePreview(message?: MessagePreviewInput) {
  if (!message) return "No messages yet";
  if (message.type === "IMAGE") return message.body?.trim() ? message.body : "Photo";
  if (message.type === "DOCUMENT") return message.body?.trim() ? message.body : "Document";
  if (message.type === "ADMIN") return message.body || "Admin message";
  return message.body;
}
