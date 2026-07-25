"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/client-error";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError("global", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-sm text-neutral-500">Something went wrong.</p>
          <button
            type="button"
            onClick={reset}
            className="text-sm font-medium text-[#7A2E3D] hover:underline"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
