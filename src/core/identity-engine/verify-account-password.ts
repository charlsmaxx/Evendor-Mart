import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Confirms the signed-in vendor still knows their Evendor login password.
 * Uses a throwaway Auth client so this check cannot replace the browser session.
 */
export async function verifyAccountPassword(params: {
  userId: string;
  email: string;
  password: string;
}): Promise<boolean> {
  const env = getSupabaseEnv();
  if (!env || !params.email || !params.password) return false;

  const supabase = createClient(env.url, env.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });

  if (error || !data.user?.id) return false;
  return data.user.id === params.userId;
}
