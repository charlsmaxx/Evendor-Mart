import type { Instrumentation } from "next";

/** Global server error hook — structured logs for Vercel / log drains. */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  errorRequest,
  errorContext
) => {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      event: "request_error",
      message,
      path: errorRequest.path,
      method: errorRequest.method,
      routePath: errorContext.routePath,
      routeType: errorContext.routeType,
      stack: process.env.NODE_ENV === "development" ? stack : undefined,
    })
  );
};
