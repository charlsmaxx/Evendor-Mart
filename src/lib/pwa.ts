/** Client-safe PWA helpers — detection only, no business logic. */

export const PWA_STORAGE = {
  dismissed: "evendor_pwa_dismissed_at",
  installed: "evendor_pwa_installed",
  visits: "evendor_pwa_visits",
  pages: "evendor_pwa_pages",
  sessionStart: "evendor_pwa_session_start",
} as const;

/** Days to wait after "Maybe Later" before asking again. */
export const PWA_DISMISS_COOLDOWN_DAYS = 14;

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in window.navigator &&
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || iosStandalone;
}

export function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const notChrome = !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return iOS && webkit && notChrome;
}

export function wasInstallDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(PWA_STORAGE.dismissed);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return true;
    const cooldownMs = PWA_DISMISS_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() - at < cooldownMs;
  } catch {
    return false;
  }
}

export function markInstallDismissed() {
  try {
    localStorage.setItem(PWA_STORAGE.dismissed, String(Date.now()));
  } catch {
    /* private mode */
  }
}

export function markInstalled() {
  try {
    localStorage.setItem(PWA_STORAGE.installed, "1");
  } catch {
    /* private mode */
  }
}

export function wasInstalledFlag(): boolean {
  try {
    return localStorage.getItem(PWA_STORAGE.installed) === "1";
  } catch {
    return false;
  }
}

/** Increment visit count once per browser session. */
export function trackVisit(): number {
  try {
    if (sessionStorage.getItem("evendor_pwa_visit_counted")) {
      return Number(localStorage.getItem(PWA_STORAGE.visits) ?? "0");
    }
    sessionStorage.setItem("evendor_pwa_visit_counted", "1");
    const next = Number(localStorage.getItem(PWA_STORAGE.visits) ?? "0") + 1;
    localStorage.setItem(PWA_STORAGE.visits, String(next));
    return next;
  } catch {
    return 0;
  }
}

/** Count distinct pathnames viewed this session (for "multiple pages" engagement). */
export function trackPageView(pathname: string): number {
  try {
    const key = PWA_STORAGE.pages;
    const raw = sessionStorage.getItem(key);
    const set = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
    set.add(pathname);
    sessionStorage.setItem(key, JSON.stringify([...set]));
    return set.size;
  } catch {
    return 0;
  }
}

export function ensureSessionStart(): number {
  try {
    const existing = sessionStorage.getItem(PWA_STORAGE.sessionStart);
    if (existing) return Number(existing);
    const now = Date.now();
    sessionStorage.setItem(PWA_STORAGE.sessionStart, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

/**
 * Engagement gate: 2+ visits, OR 30s on site, OR 3+ pages in this session.
 */
export function meetsEngagementGate(opts: {
  visits: number;
  pages: number;
  sessionStart: number;
  now?: number;
}): boolean {
  const now = opts.now ?? Date.now();
  if (opts.visits >= 2) return true;
  if (opts.pages >= 3) return true;
  if (now - opts.sessionStart >= 30_000) return true;
  return false;
}
