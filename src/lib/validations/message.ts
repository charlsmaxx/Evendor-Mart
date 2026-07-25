import { z } from "zod";

const phonePattern = /(\+?\d[\d\s-]{8,}\d)/;

const bodyField = z
  .string()
  .max(4000)
  .optional()
  .transform((v) => v ?? "");

export const createMessageSchema = z
  .object({
    conversationId: z.string().uuid(),
    body: bodyField,
    mediaUrl: z.string().url().optional(),
    mediaPublicId: z.string().optional(),
    messageType: z.enum(["IMAGE", "DOCUMENT"]).optional(),
  })
  .refine((v) => v.body.trim().length > 0 || v.mediaUrl, {
    message: "Message must include text or an attachment",
  })
  .refine((v) => !v.body || !phonePattern.test(v.body), {
    message: "Phone numbers are not allowed in messages",
  });

export const startConversationSchema = z.object({
  vendorId: z.string().uuid(),
  listingId: z.string().uuid().optional(),
  body: z.string().min(1).max(4000).optional(),
});

export const chatUploadSignSchema = z.object({
  conversationId: z.string().uuid(),
  resourceType: z.enum(["image", "raw"]).optional().default("image"),
});

export const adminMessageSchema = z
  .object({
    body: bodyField,
    mediaUrl: z.string().url().optional(),
    mediaPublicId: z.string().optional(),
    messageType: z.enum(["IMAGE", "DOCUMENT"]).optional(),
  })
  .refine((v) => v.body.trim().length > 0 || v.mediaUrl, {
    message: "Message must include text or an attachment",
  });
