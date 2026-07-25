"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  uploadChatImage,
  uploadChatDocument,
  isChatDocument,
} from "@/lib/chat-upload";
import type { MessagePayload } from "@/lib/messages-access";
import { messageFromRealtimeRow } from "@/lib/messages-access";
import {
  ArrowLeft,
  ImagePlus,
  Loader2,
  Paperclip,
  Send,
} from "lucide-react";
import { reportClientError } from "@/lib/client-error";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { ChatMessageBubble } from "@/components/messages/chat-message-bubble";
import {
  CHAT_VIRTUAL_THRESHOLD,
  ChatVirtualMessageList,
} from "@/components/messages/chat-virtual-message-list";

function formatDayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

function appendMessage(list: MessagePayload[], message: MessagePayload) {
  if (list.some((m) => m.id === message.id)) return list;
  return [...list, message];
}

function mergeReadAt(list: MessagePayload[], updated: MessagePayload) {
  return list.map((m) => (m.id === updated.id ? { ...m, readAt: updated.readAt } : m));
}

type ThreadCache = {
  messages: MessagePayload[];
  peerName?: string;
  peerAvatar?: string | null;
  hasMore?: boolean;
  nextCursor?: string | null;
};

const FIRST_ITEM_INDEX_BASE = 100_000;

export function ChatPanel({
  conversationId,
  currentUserId,
  peerName,
  peerAvatar,
  initialMessages,
  initialHasMore = false,
  initialNextCursor = null,
  adminMode = false,
  backHref,
}: {
  conversationId: string;
  currentUserId: string;
  peerName: string;
  peerAvatar?: string | null;
  initialMessages: MessagePayload[];
  initialHasMore?: boolean;
  initialNextCursor?: string | null;
  adminMode?: boolean;
  backHref?: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [peerTyping, setPeerTyping] = useState(false);
  const [firstItemIndex, setFirstItemIndex] = useState(FIRST_ITEM_INDEX_BASE);
  const bottomRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const prevCountRef = useRef(initialMessages.length);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);
  const queryClient = useQueryClient();

  const useVirtualList = messages.length >= CHAT_VIRTUAL_THRESHOLD;

  const cacheKey = useMemo(
    () => (adminMode ? ["admin-conversation", conversationId] : ["conversation", conversationId]),
    [adminMode, conversationId]
  );

  const syncCache = useCallback(
    (nextMessages: MessagePayload[], meta?: { hasMore?: boolean; nextCursor?: string | null }) => {
      queryClient.setQueryData<ThreadCache>(cacheKey, (old) => ({
        ...(old ?? {}),
        messages: nextMessages,
        ...(meta?.hasMore !== undefined ? { hasMore: meta.hasMore } : {}),
        ...(meta?.nextCursor !== undefined ? { nextCursor: meta.nextCursor } : {}),
      }));
    },
    [cacheKey, queryClient]
  );

  const applyMessages = useCallback(
    (updater: (prev: MessagePayload[]) => MessagePayload[]) => {
      setMessages((prev) => {
        const next = updater(prev);
        syncCache(next);
        return next;
      });
    },
    [syncCache]
  );

  useEffect(() => {
    setMessages(initialMessages);
    setHasMore(initialHasMore);
    setNextCursor(initialNextCursor);
    setFirstItemIndex(FIRST_ITEM_INDEX_BASE);
    prevCountRef.current = initialMessages.length;
    syncCache(initialMessages, { hasMore: initialHasMore, nextCursor: initialNextCursor });
  }, [conversationId, initialMessages, initialHasMore, initialNextCursor, syncCache]);

  const markRead = useCallback(async () => {
    const endpoint = adminMode
      ? `/api/admin/messages/${conversationId}/read`
      : `/api/messages/${conversationId}/read`;
    await fetch(endpoint, { method: "POST" });
    queryClient.setQueryData<number>(["message-unread-count"], (old) =>
      typeof old === "number" && old > 0 ? old - 1 : 0
    );
  }, [adminMode, conversationId, queryClient]);

  useEffect(() => {
    void markRead();
  }, [conversationId, markRead]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Message",
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = messageFromRealtimeRow((payload.new ?? {}) as Record<string, unknown>);
          if (!incoming) return;
          if (incoming.senderId === currentUserId) return;
          applyMessages((prev) => appendMessage(prev, incoming));
          void markRead();
          queryClient.invalidateQueries({
            queryKey: adminMode ? ["admin-conversations"] : ["conversations"],
            refetchType: "active",
          });
          queryClient.invalidateQueries({ queryKey: ["message-unread-count"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Message",
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload) => {
          const updated = messageFromRealtimeRow((payload.new ?? {}) as Record<string, unknown>);
          if (!updated?.readAt) return;
          applyMessages((prev) => mergeReadAt(prev, updated));
        }
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const userId = (payload as { userId?: string }).userId;
        if (userId && userId !== currentUserId) {
          setPeerTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setPeerTyping(false), 3000);
        }
      })
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, adminMode, applyMessages, markRead, queryClient]);

  useEffect(() => {
    if (useVirtualList) return;
    const added = messages.length - prevCountRef.current;
    prevCountRef.current = messages.length;
    bottomRef.current?.scrollIntoView({
      behavior: added === 1 ? "smooth" : "instant",
    });
  }, [messages, useVirtualList]);

  const broadcastTyping = useCallback(async () => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2000) return;
    lastTypingSentRef.current = now;
    const supabase = createClient();
    const channel = supabase.channel(`messages:${conversationId}`);
    await channel.subscribe();
    await channel.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId },
    });
    supabase.removeChannel(channel);
  }, [conversationId, currentUserId]);

  const debouncedBroadcastTyping = useDebouncedCallback(broadcastTyping, 400);

  const loadOlderMessages = useCallback(async () => {
    if (!hasMore || !nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    const endpoint = adminMode
      ? `/api/admin/messages/${conversationId}?before=${nextCursor}`
      : `/api/messages/${conversationId}?before=${nextCursor}`;
    const res = await fetch(endpoint);
    const json = await res.json();
    setLoadingOlder(false);
    if (!res.ok) {
      reportClientError("chat", json.error?.message ?? "Could not load older messages");
      return;
    }
    const older = (json.data.messages ?? []) as MessagePayload[];
    setHasMore(json.data.hasMore ?? false);
    setNextCursor(json.data.nextCursor ?? null);
    applyMessages((prev) => {
      const ids = new Set(prev.map((m) => m.id));
      const uniqueOlder = older.filter((m) => !ids.has(m.id));
      if (uniqueOlder.length > 0) {
        setFirstItemIndex((index) => index - uniqueOlder.length);
      }
      const merged = [...uniqueOlder, ...prev];
      syncCache(merged, { hasMore: json.data.hasMore, nextCursor: json.data.nextCursor });
      return merged;
    });
  }, [
    adminMode,
    applyMessages,
    conversationId,
    hasMore,
    loadingOlder,
    nextCursor,
    syncCache,
  ]);

  async function sendMessage(payload: {
    body?: string;
    mediaUrl?: string;
    mediaPublicId?: string;
    messageType?: "IMAGE" | "DOCUMENT";
  }) {
    setSending(true);
    const endpoint = adminMode ? `/api/admin/messages/${conversationId}` : "/api/messages";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adminMode ? payload : { conversationId, ...payload }),
    });
    const json = await res.json();
    setSending(false);
    if (!res.ok) {
      reportClientError("chat", json.error?.message ?? "Could not send message");
      return;
    }
    const sent = json.data as MessagePayload;
    applyMessages((m) => appendMessage(m, sent));
    setBody("");
    queryClient.invalidateQueries({
      queryKey: adminMode ? ["admin-conversations"] : ["conversations"],
      refetchType: "active",
    });
  }

  async function sendText() {
    if (!body.trim() || sending) return;
    await sendMessage({ body: body.trim() });
  }

  async function handleFilePick(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "image" | "document"
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (kind === "image" && !file.type.startsWith("image/")) {
      reportClientError("chat", "Please choose an image file");
      return;
    }
    if (kind === "document" && !isChatDocument(file)) {
      reportClientError("chat", "Unsupported document type");
      return;
    }

    setUploading(true);
    try {
      const upload =
        kind === "image"
          ? await uploadChatImage(conversationId, file)
          : await uploadChatDocument(conversationId, file);
      await sendMessage({
        body: body.trim() || file.name,
        mediaUrl: upload.mediaUrl,
        mediaPublicId: upload.mediaPublicId,
        messageType: kind === "document" ? "DOCUMENT" : "IMAGE",
      });
      setBody("");
    } catch (err) {
      reportClientError("chat", err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const grouped: { label: string; items: MessagePayload[] }[] = [];
  for (const message of messages) {
    const label = formatDayLabel(message.createdAt);
    const last = grouped[grouped.length - 1];
    if (last?.label === label) last.items.push(message);
    else grouped.push({ label, items: [message] });
  }

  return (
    <div className="flex h-full flex-col bg-[#efeae2] dark:bg-muted/20">
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        {backHref && (
          <Link href={backHref} className="md:hidden">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
        )}
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-primary/10">
          {peerAvatar ? (
            <OptimizedImage
              src={peerAvatar}
              preset="avatarSm"
              alt={peerName}
              fill
              className="object-cover"
              sizes="40px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-primary">
              {peerName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{peerName}</p>
          <p className="text-xs text-muted-foreground">
            {peerTyping
              ? "typing…"
              : adminMode
                ? "Admin view — both parties can see your messages"
                : "End-to-end via Evendor"}
          </p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-3 py-4 sm:px-6">
        {useVirtualList ? (
          <ChatVirtualMessageList
            messages={messages}
            currentUserId={currentUserId}
            hasMore={hasMore}
            loadingOlder={loadingOlder}
            onLoadOlder={() => void loadOlderMessages()}
            firstItemIndex={firstItemIndex}
          />
        ) : (
          <div className="flex-1 overflow-y-auto">
            {hasMore && (
              <div className="mb-4 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loadingOlder}
                  onClick={() => void loadOlderMessages()}
                >
                  {loadingOlder ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
                    </>
                  ) : (
                    "Load older messages"
                  )}
                </Button>
              </div>
            )}

            {grouped.map((group) => (
              <div key={group.label}>
                <div className="my-4 flex justify-center">
                  <span className="rounded-lg bg-card/90 px-3 py-1 text-xs text-muted-foreground shadow-sm">
                    {group.label}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.items.map((m) => (
                    <ChatMessageBubble
                      key={m.id}
                      message={m}
                      isMine={m.senderId === currentUserId}
                    />
                  ))}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border bg-card p-3">
        <div className="flex items-end gap-2">
          <input
            ref={imageRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handleFilePick(e, "image")}
          />
          <input
            ref={docRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,application/pdf"
            className="hidden"
            onChange={(e) => void handleFilePick(e, "document")}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 rounded-full"
            disabled={uploading || sending}
            onClick={() => imageRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 rounded-full"
            disabled={uploading || sending}
            onClick={() => docRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              debouncedBroadcastTyping();
            }}
            placeholder="Type a message"
            className="rounded-full bg-muted/50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendText();
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            className="shrink-0 rounded-full"
            disabled={!body.trim() || sending || uploading}
            onClick={() => void sendText()}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
