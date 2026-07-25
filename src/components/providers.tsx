"use client";

import { QueryCache, QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { useState } from "react";
import { reportClientError, isBenignClientError } from "@/lib/client-error";
import { ClientErrorBoundary } from "@/components/client-error-boundary";
import { GlobalErrorHandlers } from "@/components/global-error-handlers";
import { WebVitalsReporter } from "@/components/observability/web-vitals-reporter";
import { InstallPrompt } from "@/components/pwa/install-prompt";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            if (isBenignClientError(error)) return;
            reportClientError(`query:${String(query.queryKey[0] ?? "unknown")}`, error);
          },
        }),
        mutationCache: new MutationCache({
          onError: (error, _vars, _ctx, mutation) => {
            if (isBenignClientError(error)) return;
            reportClientError(
              `mutation:${String(mutation.options.mutationKey?.[0] ?? "unknown")}`,
              error
            );
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            throwOnError: false,
          },
          mutations: { throwOnError: false },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <GlobalErrorHandlers />
      <WebVitalsReporter />
      <ClientErrorBoundary scope="app-root">{children}</ClientErrorBoundary>
      <InstallPrompt />
    </QueryClientProvider>
  );
}
