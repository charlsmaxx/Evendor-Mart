"use client";

import { AdminSidebar, AdminTopbar, AdminMobileNav } from "@/components/admin/admin-nav";
import { AdminActivityPanel } from "@/components/admin/admin-activity-panel";
import { AdminAuthGate } from "@/components/admin/admin-auth-gate";
import { useAdminSessionGuard } from "@/components/admin/use-admin-me";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { isAdminReady } = useAdminSessionGuard();

  return (
    <div className="-mx-4 -my-8 flex min-h-[calc(100dvh-4rem)] flex-col bg-[#0f0b0d] sm:-mx-6 lg:-mx-8">
      <div className="flex min-h-0 flex-1">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar />
          <div className="flex min-h-0 flex-1">
            <main className="min-w-0 flex-1 overflow-y-auto p-4 pb-24 lg:p-6 lg:pb-6">
              <AdminAuthGate>{children}</AdminAuthGate>
            </main>
            {isAdminReady ? <AdminActivityPanel /> : null}
          </div>
        </div>
      </div>
      <AdminMobileNav />
    </div>
  );
}
