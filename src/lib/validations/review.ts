import { z } from "zod";

export const vendorReplySchema = z.object({
  vendorReply: z.string().min(1).max(1000),
});
