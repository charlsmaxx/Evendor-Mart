"use client";

import { useAdminSessionGuard } from "@/components/admin/use-admin-me";

/** Blocks admin client UI until /api/admin/me succeeds; redirects on 401. */
export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const { isAdminReady, isLoading } = useAdminSessionGuard();

  if (isLoading || !isAdminReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-[#E5DFD9]/50">Loading admin session…</p>
      </div>
    );
  }

  return <>{children}</>;
}
