/** Session missing or auth service unreachable — not a bug to log repeatedly. */
export function isUnauthorizedError(error: unknown): boolean {
  const msg = (
    error instanceof Error ? error.message : typeof error === "string" ? error : ""
  ).toLowerCase();
  return msg === "unauthorized" || msg.includes("401");
}

/** Transient network / Realtime errors (dev HMR, paused Supabase, tab sleep). */
export function isBenignClientError(error: unknown): boolean {
  if (isUnauthorizedError(error)) return true;
  const msg = (
    error instanceof Error ? error.message : typeof error === "string" ? error : ""
  ).toLowerCase();
  if (!msg) return false;
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    msg.includes("connection reset") ||
    msg.includes("connection refused") ||
    msg.includes("socket closed") ||
    msg.includes("1006") ||
    msg.includes("heartbeat timeout") ||
    msg.includes("aborted") ||
    msg.includes("the user aborted")
  );
}

/** Log client-side errors to the browser console (not shown in UI). Skips benign network noise. */
export function reportClientError(scope: string, error: unknown): void {
  if (isBenignClientError(error)) return;
  if (error instanceof Error) {
    console.error(`[Evendor:${scope}]`, error.message, error);
    return;
  }
  console.error(`[Evendor:${scope}]`, error);
}

let globalHandlersInstalled = false;

/** Catch uncaught window errors and unhandled promise rejections — console only. */
export function installGlobalClientErrorHandlers(): void {
  if (typeof window === "undefined" || globalHandlersInstalled) return;
  globalHandlersInstalled = true;

  window.addEventListener("error", (event) => {
    if (isBenignClientError(event.error ?? event.message)) {
      event.preventDefault();
      return;
    }
    reportClientError("window", event.error ?? event.message);
    event.preventDefault();
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (isBenignClientError(event.reason)) {
      event.preventDefault();
      return;
    }
    reportClientError("unhandled-rejection", event.reason);
    event.preventDefault();
  });
}
