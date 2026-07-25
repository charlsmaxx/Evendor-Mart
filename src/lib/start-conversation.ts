import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { reportClientError } from "@/lib/client-error";

export async function startVendorConversation({
  vendorId,
  listingId,
  vendorSlug,
  router,
}: {
  vendorId: string;
  listingId?: string;
  vendorSlug: string;
  router: AppRouterInstance;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId, listingId }),
    });

    if (res.status === 401) {
      router.push(`/login?redirect=${encodeURIComponent(`/vendors/${vendorSlug}`)}`);
      return { ok: true };
    }

    const json = await res.json().catch(() => ({}));

    if (res.ok && json.data?.id) {
      router.push(`/messages/${json.data.id}`);
      return { ok: true };
    }

    const errMsg = json.error?.message ?? "Could not start conversation. Please try again.";
    reportClientError("messages", errMsg);
    return { ok: false, error: errMsg };
  } catch (err) {
    reportClientError("messages", err);
    return { ok: false, error: "Network error. Please try again." };
  }
}
