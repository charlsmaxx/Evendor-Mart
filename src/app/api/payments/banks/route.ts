import { jsonPublic, jsonError } from "@/lib/api-response";
import { isPaystackConfigured, listNigerianBanks } from "@/lib/paystack";
import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/cache-policy";

const BANKS_CACHE_KEY = "paystack:banks:ng";
const BANKS_CACHE_TTL_SECONDS = CACHE_TTL.banks;

type BankEntry = { code: string; name: string; slug: string };

async function loadActiveBanks(): Promise<BankEntry[]> {
  const cached = await cacheGet<BankEntry[]>(BANKS_CACHE_KEY);
  if (cached) return cached;

  const banks = await listNigerianBanks();
  const byCode = new Map<string, BankEntry>();
  for (const b of banks) {
    if (!b.active) continue;
    if (!byCode.has(b.code)) {
      byCode.set(b.code, { code: b.code, name: b.name, slug: b.slug });
    }
  }
  const active = [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name));
  await cacheSet(BANKS_CACHE_KEY, active, BANKS_CACHE_TTL_SECONDS);
  return active;
}

export async function GET() {
  if (!isPaystackConfigured()) {
    return jsonError("Bank verification is not configured. Add PAYSTACK_SECRET_KEY.", 503);
  }

  try {
    const active = await loadActiveBanks();
    return jsonPublic(active, "publicMedium");
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load banks";
    return jsonError(message, 502);
  }
}
