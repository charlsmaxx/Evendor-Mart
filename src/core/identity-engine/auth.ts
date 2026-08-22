import { cache } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/core/infrastructure/prisma";

const AUTH_VALIDATION_MS = 5_000;

function isUnreachableAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const text = message.toLowerCase();
  return (
    text.includes("fetch failed") ||
    text.includes("network") ||
    text.includes("timeout") ||
    text.includes("connect") ||
    text.includes("und_err_connect") ||
    text.includes("econnreset") ||
    text.includes("enotfound")
  );
}

async function getUserFromLocalSession(): Promise<SupabaseUser | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.user ?? null;
  } catch {
    return null;
  }
}

async function getValidatedUser() {
  const supabase = await createClient();
  const result = await Promise.race([
    supabase.auth.getUser(),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Auth validation timeout")), AUTH_VALIDATION_MS);
    }),
  ]);
  return result;
}

export async function getSessionUser() {
  try {
    const {
      data: { user },
      error,
    } = await getValidatedUser();
    if (!error && user) return user;

    if (error && isUnreachableAuthError(error)) {
      const localUser = await getUserFromLocalSession();
      if (localUser) {
        console.warn("[Evendor:auth] Auth API unreachable; using signed session cookie.");
        return localUser;
      }
      console.error(
        "[Evendor:auth] Cannot reach Supabase Auth — check project status and network, then retry.",
        error.message
      );
    }
    return null;
  } catch (err) {
    if (isUnreachableAuthError(err)) {
      const localUser = await getUserFromLocalSession();
      if (localUser) {
        console.warn("[Evendor:auth] Auth API unreachable; using signed session cookie.");
        return localUser;
      }
    }
    console.error("[Evendor:auth] Session validation failed:", err);
    return null;
  }
}

export const getOrCreateDbUser = cache(async (userId: string, email?: string) => {
  const resolvedEmail = email ?? `${userId}@evendor.local`;
  let user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: userId,
        email: resolvedEmail,
      },
    });
  }
  return user;
});

export async function requireAuth() {
  const supabaseUser = await getSessionUser();
  if (!supabaseUser) return null;
  return getOrCreateDbUser(supabaseUser.id, supabaseUser.email);
}
