import "server-only";

import { Prisma, PrismaClient } from "@prisma/client";
import { OBSERVABILITY, logStructuredWarn } from "@/lib/observability";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaUrl: string | undefined;
  prismaConnectPromise: Promise<void> | undefined;
  prismaSemaphore: { sem: Semaphore; max: number } | undefined;
};

const CONNECTION_ERROR_CODES = new Set(["P1001", "P1002", "P1017", "P2024"]);

/** Limits in-flight Prisma queries so they don't fight over a tiny connection pool. */
class Semaphore {
  private active = 0;
  private waiters: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active++;
      return;
    }
    await new Promise<void>((resolve) => {
      this.waiters.push(resolve);
    });
    this.active++;
  }

  release(): void {
    this.active = Math.max(0, this.active - 1);
    const next = this.waiters.shift();
    if (next) next();
  }
}

function isConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return CONNECTION_ERROR_CODES.has(error.code);
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return error.message.toLowerCase().includes("engine is not yet connected");
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("engine is not yet connected") ||
      msg.includes("connection closed") ||
      msg.includes("can't reach database server") ||
      msg.includes("connection pool")
    );
  }
  return false;
}

function appendParam(url: string, key: string, value: string): string {
  if (url.includes(`${key}=`)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${key}=${value}`;
}

type PoolMode = "transaction" | "session" | "direct";

function detectPoolMode(url: string): PoolMode {
  if (url.includes("pgbouncer=true") || url.includes(":6543")) return "transaction";
  if (url.includes(":5432")) return "session";
  return "direct";
}

/** Ensure Supabase pooler connections always use SSL and sane timeouts. */
function normalizeDatabaseUrl(
  raw: string | undefined,
  options?: { dev?: boolean }
): string {
  if (!raw) {
    const message =
      "DATABASE_URL is not set. Add it to .env.local (see .env.example).";
    console.error("[prisma]", message);
    throw new Error(message);
  }

  const dev = options?.dev ?? process.env.NODE_ENV === "development";
  const mode = detectPoolMode(raw);

  let url = raw.includes("sslmode=") ? raw : appendParam(raw, "sslmode", "require");
  url = appendParam(url, "connect_timeout", dev ? "60" : "30");
  url = appendParam(url, "pool_timeout", dev ? "60" : "30");

  if (mode === "transaction") {
    // PgBouncer transaction mode: keep a single Prisma connection in production.
    url = appendParam(url, "connection_limit", dev ? "2" : "1");
  } else if (dev) {
    // Session / direct: allow modest parallelism for `next dev`.
    url = appendParam(url, "connection_limit", "8");
  } else {
    url = appendParam(url, "connection_limit", "3");
  }

  return url;
}

function getMaxConcurrentQueries(url: string): number {
  const dev = process.env.NODE_ENV === "development";
  const mode = detectPoolMode(url);
  if (mode === "transaction") return dev ? 2 : 1;
  return dev ? 6 : 3;
}

function resolveDatabaseUrl(): string {
  const dev = process.env.NODE_ENV === "development";
  const sessionUrl = process.env.DATABASE_SESSION_URL?.trim();
  if (dev && sessionUrl) {
    return normalizeDatabaseUrl(sessionUrl, { dev: true });
  }
  return normalizeDatabaseUrl(process.env.DATABASE_URL, { dev });
}

function getSemaphore(url: string): Semaphore {
  const max = getMaxConcurrentQueries(url);
  if (!globalForPrisma.prismaSemaphore || globalForPrisma.prismaSemaphore.max !== max) {
    globalForPrisma.prismaSemaphore = { sem: new Semaphore(max), max };
  }
  return globalForPrisma.prismaSemaphore.sem;
}

function ensureConnected(base: PrismaClient): Promise<void> {
  if (!globalForPrisma.prismaConnectPromise) {
    globalForPrisma.prismaConnectPromise = base.$connect().catch((error) => {
      globalForPrisma.prismaConnectPromise = undefined;
      throw error;
    });
  }
  return globalForPrisma.prismaConnectPromise;
}

function getSlowQueryThresholdMs(): number {
  const raw = process.env.PRISMA_LOG_SLOW_MS;
  if (raw === "0") return 0;
  if (raw) return Math.max(0, Number(raw) || 0);
  return process.env.NODE_ENV === "development"
    ? OBSERVABILITY.prismaSlowMsDev
    : OBSERVABILITY.prismaSlowMsProd;
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = resolveDatabaseUrl();
  const semaphore = getSemaphore(databaseUrl);
  const slowMs = getSlowQueryThresholdMs();

  if (process.env.DIRECT_URL) {
    process.env.DIRECT_URL = normalizeDatabaseUrl(process.env.DIRECT_URL);
  }

  const base = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  void ensureConnected(base);

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const maxAttempts = 3;
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await semaphore.acquire();
            const started = slowMs > 0 ? performance.now() : 0;
            try {
              await ensureConnected(base);
              const result = await query(args);
              if (slowMs > 0) {
                const elapsed = performance.now() - started;
                if (elapsed >= slowMs) {
                  logStructuredWarn("db_slow", {
                    model: model ?? "?",
                    operation,
                    ms: Math.round(elapsed),
                  });
                }
              }
              return result;
            } catch (error) {
              const canRetry = isConnectionError(error) && attempt < maxAttempts - 1;
              if (!canRetry) throw error;

              globalForPrisma.prismaConnectPromise = undefined;
              await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
              await ensureConnected(base);
            } finally {
              semaphore.release();
            }
          }
          throw new Error("Database query failed after retries");
        },
      },
    },
  }) as unknown as PrismaClient;
}

function getPrismaClient(): PrismaClient {
  const databaseUrl = resolveDatabaseUrl();
  if (!globalForPrisma.prisma || globalForPrisma.prismaUrl !== databaseUrl) {
    if (globalForPrisma.prisma) {
      globalForPrisma.prismaConnectPromise = undefined;
      globalForPrisma.prismaSemaphore = undefined;
      globalForPrisma.prisma.$disconnect().catch(() => undefined);
    }
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaUrl = databaseUrl;
  }
  return globalForPrisma.prisma;
}

export const prisma = getPrismaClient();
