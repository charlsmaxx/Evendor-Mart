import type { UserRole } from "@prisma/client";

type ConversationWithVendor = {
  customerId: string;
  vendor: { userId: string };
};

export function isAdmin(user: { role: UserRole }) {
  return user.role === "ADMIN";
}

export function canAccessConversation(
  user: { id: string; role: UserRole },
  conversation: ConversationWithVendor
) {
  if (isAdmin(user)) return true;
  return (
    conversation.customerId === user.id || conversation.vendor.userId === user.id
  );
}

export function getConversationPeerName(
  user: { id: string; role: UserRole },
  conversation: {
    customerId: string;
    customer: { fullName: string | null; email: string };
    vendor: { businessName: string; userId: string };
  }
) {
  const isVendorViewer = conversation.vendor.userId === user.id;
  if (isVendorViewer) {
    return conversation.customer.fullName ?? conversation.customer.email.split("@")[0];
  }
  return conversation.vendor.businessName;
}

export function getConversationPeerAvatar(
  user: { id: string },
  conversation: {
    customerId: string;
    customer: { avatarUrl: string | null };
    vendor: { userId: string };
  }
) {
  const isVendorViewer = conversation.vendor.userId === user.id;
  if (isVendorViewer) return conversation.customer.avatarUrl;
  return null;
}

export type MessagePayload = {
  id: string;
  body: string;
  senderId: string;
  type: string;
  mediaUrl: string | null;
  mediaPublicId: string | null;
  readAt: string | null;
  createdAt: string;
  sender?: {
    fullName: string | null;
    role: UserRole;
    avatarUrl: string | null;
  };
};

export function serializeMessage(message: {
  id: string;
  body: string;
  senderId: string;
  type: string;
  mediaUrl?: string | null;
  mediaPublicId?: string | null;
  readAt?: Date | null;
  createdAt: Date;
  sender?: {
    fullName: string | null;
    role: UserRole;
    avatarUrl: string | null;
  };
}): MessagePayload {
  return {
    id: message.id,
    body: message.body,
    senderId: message.senderId,
    type: message.type,
    mediaUrl: message.mediaUrl ?? null,
    mediaPublicId: message.mediaPublicId ?? null,
    readAt: message.readAt?.toISOString() ?? null,
    createdAt: message.createdAt.toISOString(),
    sender: message.sender,
  };
}

/** Build a message from Supabase realtime INSERT/UPDATE payload (no sender join). */
export function messageFromRealtimeRow(row: Record<string, unknown>): MessagePayload | null {
  if (!row.id || !row.senderId || !row.createdAt) return null;
  return {
    id: String(row.id),
    body: String(row.body ?? ""),
    senderId: String(row.senderId),
    type: String(row.type ?? "TEXT"),
    mediaUrl: row.mediaUrl ? String(row.mediaUrl) : null,
    mediaPublicId: row.mediaPublicId ? String(row.mediaPublicId) : null,
    readAt: row.readAt ? new Date(String(row.readAt)).toISOString() : null,
    createdAt: new Date(String(row.createdAt)).toISOString(),
  };
}

export function sortConversations<T extends { updatedAt: string; pinnedAt?: string | null }>(
  conversations: T[]
) {
  return [...conversations].sort((a, b) => {
    const aPin = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
    const bPin = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
    if (aPin !== bPin) return bPin - aPin;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export const MESSAGE_PAGE_SIZE = 50;
