"use client";

import { useEffect } from "react";
import { installGlobalClientErrorHandlers } from "@/lib/client-error";

/** Installs window-level error handlers once on the client. */
export function GlobalErrorHandlers() {
  useEffect(() => {
    installGlobalClientErrorHandlers();
  }, []);
  return null;
}
