import "server-only";

import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { prisma } from "@/core/infrastructure/prisma";
import { writeAuditLog } from "@/core/audit-engine";
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
  type LegalAcceptanceMethod,
} from "@/lib/legal";

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
  const row = await prisma.legalAcceptance.findUnique({
    where: {
      userId_termsVersion_privacyVersion: {
        userId,
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
      },
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function recordLegalAcceptance(input: {
  userId: string;
  method: LegalAcceptanceMethod;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ recorded: boolean; alreadyAccepted: boolean }> {
  const existing = await prisma.legalAcceptance.findUnique({
    where: {
      userId_termsVersion_privacyVersion: {
        userId: input.userId,
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
      },
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: input.userId },
      data: { termsAcceptedAt: new Date() },
    });
    return { recorded: false, alreadyAccepted: true };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.legalAcceptance.create({
        data: {
          userId: input.userId,
          termsVersion: TERMS_VERSION,
          privacyVersion: PRIVACY_VERSION,
          acceptanceMethod: input.method,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
      });
      await tx.user.update({
        where: { id: input.userId },
        data: { termsAcceptedAt: new Date() },
      });
      await writeAuditLog(
        {
          actorId: input.userId,
          action: "LEGAL_ACCEPTANCE_RECORDED",
          entityType: "LegalAcceptance",
          entityId: input.userId,
          metadata: {
            termsVersion: TERMS_VERSION,
            privacyVersion: PRIVACY_VERSION,
            method: input.method,
          },
        },
        tx
      );
    });
    return { recorded: true, alreadyAccepted: false };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { recorded: false, alreadyAccepted: true };
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
