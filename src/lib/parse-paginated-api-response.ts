import type { PaginationMeta } from "@/lib/pagination";

type PaginatedApiSuccess<T> = { ok: true; data: T; meta?: PaginationMeta };
type ApiFailure = { ok: false; status: number; message: string };

/** Parse paginated API JSON — returns data array and optional meta. */
export async function parsePaginatedApiResponse<T>(
  res: Response
): Promise<PaginatedApiSuccess<T[]> | ApiFailure> {
  const text = await res.text();
  if (!text.trim()) {
    return {
      ok: false,
      status: res.status,
      message: res.ok ? "Empty response from server" : `Request failed (${res.status})`,
    };
  }

  let json: { data?: T[]; meta?: PaginationMeta; error?: { message?: string } };
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    return {
      ok: false,
      status: res.status,
      message: `Invalid server response (${res.status})`,
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      message: json.error?.message ?? `Request failed (${res.status})`,
    };
  }

  return { ok: true, data: json.data ?? [], meta: json.meta };
}
