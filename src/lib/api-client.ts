/** User-facing copy when a request fails in a way that is not useful to show. */
export const GENERIC_REQUEST_ERROR =
  "We couldn't complete that just now. Please try again.";

function isTechnicalErrorMessage(message: string) {
  const msg = message.toLowerCase();
  return (
    msg.includes("unexpected end of json") ||
    msg.includes("failed to execute 'json'") ||
    msg.includes("is not valid json") ||
    msg.includes("syntaxerror") ||
    msg.includes("internal server error") ||
    msg.includes("prisma") ||
    msg.includes("cannot read properties") ||
    msg.includes("unexpected token") ||
    msg.includes("econnreset") ||
    msg.includes("fetch failed")
  );
}

export function userFacingRequestError(error: unknown, fallback = GENERIC_REQUEST_ERROR) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  if (!message || isTechnicalErrorMessage(message)) return fallback;
  return message;
}

export async function readApiJson<T = unknown>(
  res: Response
): Promise<{ ok: boolean; status: number; json: T | null }> {
  const json = (await res.json().catch(() => null)) as T | null;
  return { ok: res.ok, status: res.status, json };
}

export function apiErrorMessage(json: unknown, fallback = GENERIC_REQUEST_ERROR) {
  if (
    json &&
    typeof json === "object" &&
    "error" in json &&
    json.error &&
    typeof json.error === "object" &&
    "message" in json.error &&
    typeof (json.error as { message: unknown }).message === "string"
  ) {
    return userFacingRequestError((json.error as { message: string }).message, fallback);
  }
  return fallback;
}
