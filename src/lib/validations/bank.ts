import { z } from "zod";

export const bankAccountSchema = z.object({
  bankCode: z.string().min(2),
  bankName: z.string().min(2),
  accountNumber: z.string().regex(/^\d{10}$/, "Account number must be 10 digits"),
  accountName: z.string().min(2),
});

export type BankAccountInput = z.infer<typeof bankAccountSchema>;
