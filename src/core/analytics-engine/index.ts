/** Pure helpers — safe to import from client components. */
export * from "./admin-dashboard";

/** Server-only DB loaders — do not import from `"use client"` modules. */
export * from "./platform-stats";
export * from "./cached-admin-stats";
