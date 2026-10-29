export function getAuthenticatedUserId(user: unknown): string | null {
  if (!user || typeof user !== "object" || !("id" in user)) return null;
  const id = (user as { id?: unknown }).id;
  return typeof id === "string" && id.trim().length > 0 ? id : null;
}

export function isNextDynamicServerUsageError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    (error as { digest?: unknown }).digest === "DYNAMIC_SERVER_USAGE"
  );
}

export async function findByAuthenticatedUserId<T>(
  userId: unknown,
  findUnique: (validUserId: string) => Promise<T | null>
): Promise<T | null> {
  if (typeof userId !== "string" || userId.trim().length === 0) return null;
  return findUnique(userId);
}
