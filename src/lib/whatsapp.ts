/** Public customer-care WhatsApp (digits with country code). Override via env. */
const DEFAULT_WHATSAPP = "2347066997479";

export function getWhatsAppPhone(): string {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || DEFAULT_WHATSAPP;
  return raw.replace(/\D/g, "");
}

/** Build a wa.me deep link with an optional pre-filled message. */
export function getWhatsAppHref(message: string): string | null {
  const phone = getWhatsAppPhone();
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
