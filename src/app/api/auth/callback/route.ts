import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { HTTP_CACHE } from "@/lib/cache-policy";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/marketplace";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await getOrCreateDbUser(data.user.id, data.user.email ?? undefined);
      return NextResponse.redirect(`${origin}${next}`, { headers: HTTP_CACHE.privateNoStore });
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`, { headers: HTTP_CACHE.privateNoStore });
}
