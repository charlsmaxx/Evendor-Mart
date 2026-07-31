import { z } from "zod";

const selectedAddOnSchema = z.object({
  addOnId: z.string().min(1),
  quantity: z.number().int().positive().max(99).default(1),
});

export const createBookingSchema = z.object({
  listingId: z.string().uuid(),
  eventDate: z.string().datetime(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  eventType: z.string().max(80).optional(),
  guestCount: z.number().int().positive().optional(),
  totalAmount: z.number().int().positive(),
  notes: z.string().max(500).optional(),
  /**
   * Opt in to spending rewards. Only a flag — the discount is computed from the wallet
   * server-side, so the client cannot name its own figure.
   */
  applyRewards: z.boolean().optional().default(false),
  /** Selected service package id (from vendor metadata.packages). */
  packageId: z.string().min(1).optional(),
  selectedAddOns: z.array(selectedAddOnSchema).max(50).optional().default([]),
  /** Dynamic category field answers. */
  categoryAnswers: z.record(z.string(), z.unknown()).optional(),
  /** Multi-selected services/styles from the vendor services list. */
  selectedServices: z.array(z.string().min(1).max(120)).max(40).optional().default([]),
  /** Customer must accept the package cancellation policy before pay. */
  acceptCancellationPolicy: z.boolean().optional().default(false),
});

export const updateBookingSchema = z.object({
  status: z.enum(["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "DECLINED"]),
});

export const cancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
  adminOverride: z.boolean().optional(),
});
