import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HTTP_CACHE } from "@/lib/cache-policy";

function safeNextPath(raw: string | null) {
  // Default to homepage when `next` is missing/invalid (e.g. new sign-ups).
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const acceptTerms = searchParams.get("terms") === "1";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const user = await getOrCreateDbUser(data.user.id, data.user.email ?? undefined);
      if (acceptTerms && !user.termsAcceptedAt) {
        await prisma.user.update({
          where: { id: user.id },
          data: { termsAcceptedAt: new Date() },
        });
      }
      return NextResponse.redirect(`${origin}${next}`, { headers: HTTP_CACHE.privateNoStore });
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`, { headers: HTTP_CACHE.privateNoStore });
}
