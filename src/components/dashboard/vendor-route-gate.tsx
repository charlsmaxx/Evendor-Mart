"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function VendorRouteGate({
  isVendor,
  children,
}: {
  isVendor: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isVendor && pathname !== "/vendor" && pathname.startsWith("/vendor")) {
      router.replace("/vendor");
    }
  }, [isVendor, pathname, router]);

  if (!isVendor && pathname !== "/vendor" && pathname.startsWith("/vendor")) {
    return null;
  }

  return <>{children}</>;
}
