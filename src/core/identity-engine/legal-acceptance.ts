import "server-only";

import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/core/infrastructure/prisma";
import { writeAuditLog } from "@/core/audit-engine";
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
  type LegalAcceptanceMethod,
} from "@/lib/legal";

type LegalAcceptanceRow = { id: string };

function getLegalAcceptanceDelegate() {
  return (prisma as { legalAcceptance?: typeof prisma.legalAcceptance }).legalAcceptance;
}

function isMissingLegalTable(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2021" || error.code === "P2010";
  }
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("LegalAcceptance") &&
    (message.includes("does not exist") ||
      message.includes("Cannot read properties of undefined") ||
      message.toLowerCase().includes("relation") && message.toLowerCase().includes("does not exist"))
  );
}

async function findCurrentAcceptance(userId: string): Promise<LegalAcceptanceRow | null> {
  const delegate = getLegalAcceptanceDelegate();
  if (delegate) {
    return delegate.findUnique({
      where: {
        userId_termsVersion_privacyVersion: {
          userId,
          termsVersion: TERMS_VERSION,
          privacyVersion: PRIVACY_VERSION,
        },
      },
      select: { id: true },
    });
  }

  const rows = await prisma.$queryRaw<LegalAcceptanceRow[]>`
    SELECT id FROM "LegalAcceptance"
    WHERE "userId" = ${userId}
      AND "termsVersion" = ${TERMS_VERSION}
      AND "privacyVersion" = ${PRIVACY_VERSION}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function insertAcceptance(input: {
  userId: string;
  method: LegalAcceptanceMethod;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const delegate = getLegalAcceptanceDelegate();
  if (delegate) {
    await delegate.create({
      data: {
        userId: input.userId,
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        acceptanceMethod: input.method,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
    return;
  }

  await prisma.$executeRaw`
    INSERT INTO "LegalAcceptance"
      ("id", "userId", "termsVersion", "privacyVersion", "acceptanceMethod", "ipAddress", "userAgent")
    VALUES
      (${randomUUID()}, ${input.userId}, ${TERMS_VERSION}, ${PRIVACY_VERSION}, ${input.method}, ${input.ipAddress ?? null}, ${input.userAgent ?? null})
    ON CONFLICT ("userId", "termsVersion", "privacyVersion") DO NOTHING
  `;
}

export function getRequestClientMeta(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ipAddress =
    forwarded?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    null;
  const userAgent = req.headers.get("user-agent");
  return {
    ipAddress: ipAddress?.slice(0, 128) || null,
    userAgent: userAgent?.slice(0, 512) || null,
  };
}

export function inferLegalMethodFromAuth(input: {
  provider?: string | null;
  otpType?: string | null;
}): LegalAcceptanceMethod {
  const provider = (input.provider ?? "").toLowerCase();
  if (provider === "google") return "google";
  const otpType = (input.otpType ?? "").toLowerCase();
  if (otpType === "magiclink" || otpType === "email") return "otp";
  if (otpType === "signup") return "email";
  if (provider === "email") return "email";
  return "email";
}

export async function hasCurrentLegalAcceptance(userId: string) {
  try {
    return Boolean(await findCurrentAcceptance(userId));
  } catch (error) {
    if (isMissingLegalTable(error) || error instanceof TypeError) {
      console.error("[Evendor:legal] Acceptance lookup unavailable", error);
      return false;
    }
    throw error;
  }
}

export async function recordLegalAcceptance(input: {
  userId: string;
  method: LegalAcceptanceMethod;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ recorded: boolean; alreadyAccepted: boolean }> {
  try {
    const existing = await findCurrentAcceptance(input.userId);
    if (existing) {
      await prisma.user.update({
        where: { id: input.userId },
        data: { termsAcceptedAt: new Date() },
      });
      return { recorded: false, alreadyAccepted: true };
    }

    await insertAcceptance(input);
    await prisma.user.update({
      where: { id: input.userId },
      data: { termsAcceptedAt: new Date() },
    });
    try {
      await writeAuditLog({
        actorId: input.userId,
        action: "LEGAL_ACCEPTANCE_RECORDED",
        entityType: "LegalAcceptance",
        entityId: input.userId,
        metadata: {
          termsVersion: TERMS_VERSION,
          privacyVersion: PRIVACY_VERSION,
          method: input.method,
        },
      });
    } catch (error) {
      console.error("[Evendor:legal] Audit write failed after acceptance", error);
    }
    return { recorded: true, alreadyAccepted: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      await prisma.user.update({
        where: { id: input.userId },
        data: { termsAcceptedAt: new Date() },
      });
      return { recorded: false, alreadyAccepted: true };
    }

    if (isMissingLegalTable(error) || error instanceof TypeError) {
      console.error(
        "[Evendor:legal] LegalAcceptance table/client unavailable; stored termsAcceptedAt only. Run prisma/add-legal-acceptances.sql",
        error
      );
      await prisma.user.update({
        where: { id: input.userId },
        data: { termsAcceptedAt: new Date() },
      });
      return { recorded: false, alreadyAccepted: false };
    }

    throw error;
  }
}

export async function ensureDbUser(userId: string, email?: string) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) return { user: existing, created: false };

  const resolvedEmail = email ?? `${userId}@evendor.local`;
  try {
    const user = await prisma.user.create({
      data: { id: userId, email: resolvedEmail },
    });
    return { user, created: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) return { user, created: false };
    }
    throw error;
  }
}
