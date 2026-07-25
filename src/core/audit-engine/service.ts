import type { Prisma } from "@prisma/client";
import { prisma } from "@/core/infrastructure/prisma";

export type AuditLogInput = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/** Single audit write path for all engines and API routes. */
export async function writeAuditLog(
  input: AuditLogInput,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx ?? prisma;
  await client.auditLog.create({ data: input });
}
