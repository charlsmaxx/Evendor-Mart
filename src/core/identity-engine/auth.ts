import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/core/infrastructure/prisma";

export async function getSessionUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes("fetch failed") ||
        msg.includes("network") ||
        msg.includes("timeout") ||
        msg.includes("connect")
      ) {
        console.error(
          "[Evendor:auth] Cannot reach Supabase Auth — check project status and network, then retry.",
          error.message
        );
      }
      return null;
    }
    return user;
  } catch (err) {
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
