/** Build a signup URL that returns the visitor to the page they came from. */
export function signupUrl(redirectPath?: string) {
  const path =
    redirectPath && redirectPath.startsWith("/") && !redirectPath.startsWith("//")
      ? redirectPath
      : "/";
  return `/register?redirect=${encodeURIComponent(path)}`;
}

/** Current path + search for post-auth return (client only). */
export function currentPathForRedirect() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}
