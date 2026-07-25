type ApiSuccess<T> = { ok: true; data: T };
type ApiFailure = { ok: false; status: number; message: string };

/** Parse API JSON safely — avoids "Unexpected end of JSON input" on empty 500 bodies. */
export async function parseApiResponse<T>(res: Response): Promise<ApiSuccess<T> | ApiFailure> {
  const text = await res.text();
  if (!text.trim()) {
    return {
      ok: false,
      status: res.status,
      message: res.ok ? "Empty response from server" : `Request failed (${res.status})`,
    };
  }

  let json: { data?: T; error?: { message?: string } };
  try {
    json = JSON.parse(text) as { data?: T; error?: { message?: string } };
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

  return { ok: true, data: json.data as T };
}
