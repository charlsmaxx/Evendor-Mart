export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey || url.includes("[PROJECT]") || anonKey.includes("your-")) {
    return null;
  }

  return { url, anonKey };
}

/** Format auth/network errors and log them to the console (not shown in UI). */
export function logAuthError(message: string, raw?: unknown): void {
  const lower = message.toLowerCase();
  let detail = message;
  if (
    lower === "failed to fetch" ||
    lower.includes("network") ||
    lower.includes("fetch failed")
  ) {
    detail =
      "Cannot reach Supabase Auth. Your Supabase project may be paused or misconfigured — open the Supabase dashboard, restore the project if needed, then try again.";
  }
  console.error("[Evendor:auth]", detail, raw ?? message);
}

/** @deprecated Use logAuthError — kept for callers that need the formatted string for logging elsewhere */
export function formatAuthError(message: string) {
  const lower = message.toLowerCase();
  if (
    lower === "failed to fetch" ||
    lower.includes("network") ||
    lower.includes("fetch failed")
  ) {
    return "Cannot reach Supabase Auth. Your Supabase project may be paused or misconfigured — open the Supabase dashboard, restore the project if needed, then try again.";
  }
  return message;
}
