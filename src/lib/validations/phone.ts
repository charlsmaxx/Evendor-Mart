import { z } from "zod";

const NIGERIAN_MOBILE_PREFIXES = ["80", "81", "70", "90", "802", "803", "804", "805", "806", "807", "808", "809", "810", "811", "812", "813", "814", "815", "816", "817", "818", "819"] as const;

function isValidNigerianMobile(normalized: string): boolean {
  if (!normalized.startsWith("+234")) return false;
  const national = normalized.slice(4);
  if (national.length !== 10) return false;
  const prefix = national.slice(0, 3);
  const prefix2 = national.slice(0, 2);
  return NIGERIAN_MOBILE_PREFIXES.some((p) => prefix.startsWith(p) || prefix2.startsWith(p));
}

export function normalizeNigerianPhone(input: string): string {
  const cleaned = input.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("+234")) {
    const national = cleaned.slice(4);
    if (national.length === 10) return `+234${national}`;
  }
  if (cleaned.startsWith("0")) {
    const national = cleaned.slice(1);
    if (national.length === 10) return `+234${national}`;
  }
  if (cleaned.startsWith("234")) {
    const national = cleaned.slice(3);
    if (national.length === 10) return `+234${national}`;
  }
  return cleaned;
}

export function isValidNigerianPhone(input: string): boolean {
  const normalized = normalizeNigerianPhone(input);
  return isValidNigerianMobile(normalized);
}

export const businessPhoneSchema = z
  .string()
  .max(30)
  .optional()
  .nullable()
  .transform((val) => {
    if (!val || val.trim() === "") return null;
    const normalized = normalizeNigerianPhone(val);
    if (!isValidNigerianMobile(normalized)) {
      throw new z.ZodError([
        {
          code: "custom",
          message: "Invalid Nigerian phone number format",
          path: ["businessPhone"],
        },
      ]);
    }
    return normalized;
  });

export type BusinessPhone = z.infer<typeof businessPhoneSchema>;