"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { CategoriesMobileAccordion } from "@/components/categories-menu";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type MeUser = {
  id: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  role: string;
  isVendor: boolean;
};

const guestNavLinksBefore = [{ href: "/", label: "Home" }] as const;
const guestNavLinksAfter = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/marketplace", label: "Marketplace" },
] as const;

const authNavLinksBefore = [
  { href: "/", label: "Home" },
  { href: "/marketplace", label: "Marketplace" },
] as const;
const authNavLinksAfter = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/notifications", label: "Notifications" },
  { href: "/dashboard", label: "Profile" },
] as const;

async function fetchMe(): Promise<MeUser | null> {
  const res = await fetch("/api/me", { credentials: "same-origin" });
  if (res.status === 401 || !res.ok) return null;
  const json = await res.json();
  return (json.data as MeUser) ?? null;
}

type MobileNavDrawerProps = {
  /** Render only the menu button (for placing inside an existing header). */
  triggerClassName?: string;
};

export function MobileNavDrawer({ triggerClassName }: MobileNavDrawerProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    queryClient.setQueryData(["me"], null);
    await queryClient.invalidateQueries({ queryKey: ["me"] });
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const displayName = me?.fullName?.trim() || me?.email?.split("@")[0] || "Account";
  const initial = displayName.charAt(0).toUpperCase();

  /* Portal out of header (backdrop-blur traps fixed children) so the drawer sits above the page */
  const drawer =
    mounted &&
    createPortal(
      <div
        className={cn(
          "fixed inset-0 z-[200] overflow-hidden overscroll-none md:hidden",
          open ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-black/50 transition-opacity",
            open ? "opacity-100" : "opacity-0"
          )}
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          tabIndex={open ? 0 : -1}
        />

        <aside
          className={cn(
            "absolute inset-y-0 right-0 flex h-[100dvh] w-[min(88vw,340px)] max-w-full flex-col bg-primary text-primary-foreground shadow-2xl transition-transform duration-300 ease-out will-change-transform",
            open ? "translate-x-0" : "translate-x-full"
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="flex items-center justify-between border-b border-white/15 px-4 py-4">
            <BrandLogo heightClass="h-10" className="brightness-0 invert" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="rounded-md p-1 text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {me ? (
            <>
              <div className="border-b border-white/15 px-4 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-lg font-semibold text-primary">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{displayName}</p>
                    <p className="truncate text-sm text-white/75">{me.email}</p>
                  </div>
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto px-2 py-3">
                {authNavLinksBefore.map((l) => (
                  <Link
                    key={l.href + l.label}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-3.5 text-sm font-medium text-white hover:bg-white/10"
                  >
                    {l.label}
                  </Link>
                ))}
                <CategoriesMobileAccordion
                  label="Category"
                  variant="dark"
                  onNavigate={() => setOpen(false)}
                />
                {authNavLinksAfter.map((l) => (
                  <Link
                    key={l.href + l.label}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-3.5 text-sm font-medium text-white hover:bg-white/10"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-auto border-t border-white/15 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2 border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </Button>
              </div>
            </>
          ) : (
            <>
              <nav className="flex-1 overflow-y-auto px-2 py-3">
                {guestNavLinksBefore.map((l) => (
                  <Link
                    key={l.href + l.label}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-3.5 text-sm font-medium text-white hover:bg-white/10"
                  >
                    {l.label}
                  </Link>
                ))}
                <CategoriesMobileAccordion
                  label="Categories"
                  variant="dark"
                  onNavigate={() => setOpen(false)}
                />
                {guestNavLinksAfter.map((l) => (
                  <Link
                    key={l.href + l.label}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-3.5 text-sm font-medium text-white hover:bg-white/10"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-auto space-y-2 border-t border-white/15 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <Link href="/login" onClick={() => setOpen(false)} className="block">
                  <Button
                    variant="outline"
                    className="w-full border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  >
                    Log in
                  </Button>
                </Link>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="block"
                >
                  <Button className="w-full bg-white text-primary hover:bg-white/90">
                    Get started
                  </Button>
                </Link>
              </div>
            </>
          )}
        </aside>
      </div>,
      document.body
    );

  return (
    <>
      <button
        type="button"
        className={cn("text-foreground md:hidden", triggerClassName)}
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu className="h-6 w-6" />
      </button>
      {drawer}
    </>
  );
}
