"use client";

import { useMemo } from "react";
import { Virtuoso } from "react-virtuoso";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessageBubble } from "@/components/messages/chat-message-bubble";
import type { MessagePayload } from "@/lib/messages-access";

export type ChatVirtualItem =
  | { kind: "header"; id: string; label: string }
  | { kind: "message"; id: string; message: MessagePayload };

function formatDayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

export function buildChatVirtualItems(messages: MessagePayload[]): ChatVirtualItem[] {
  const items: ChatVirtualItem[] = [];
  let lastLabel = "";
  for (const message of messages) {
    const label = formatDayLabel(message.createdAt);
    if (label !== lastLabel) {
      items.push({ kind: "header", id: `header-${label}`, label });
      lastLabel = label;
    }
    items.push({ kind: "message", id: message.id, message });
  }
  return items;
}

export const CHAT_VIRTUAL_THRESHOLD = 30;

export function ChatVirtualMessageList({
  messages,
  currentUserId,
  hasMore,
  loadingOlder,
  onLoadOlder,
  firstItemIndex,
}: {
  messages: MessagePayload[];
  currentUserId: string;
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  firstItemIndex: number;
}) {
  const items = useMemo(() => buildChatVirtualItems(messages), [messages]);

  return (
    <Virtuoso
      className="h-full min-h-0 flex-1"
      style={{ height: "100%" }}
      data={items}
      firstItemIndex={firstItemIndex}
      initialTopMostItemIndex={items.length > 0 ? items.length - 1 : 0}
      followOutput="smooth"
      increaseViewportBy={{ top: 240, bottom: 240 }}
      startReached={() => {
        if (hasMore && !loadingOlder) onLoadOlder();
      }}
      components={{
        Header: () =>
          hasMore ? (
            <div className="mb-4 flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loadingOlder}
                onClick={() => onLoadOlder()}
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
          ) : null,
      }}
      itemContent={(_index, item) => {
        if (item.kind === "header") {
          return (
            <div className="my-4 flex justify-center">
              <span className="rounded-lg bg-card/90 px-3 py-1 text-xs text-muted-foreground shadow-sm">
                {item.label}
              </span>
            </div>
          );
        }
        return (
          <div className="pb-2">
            <ChatMessageBubble
              message={item.message}
              isMine={item.message.senderId === currentUserId}
            />
          </div>
        );
      }}
    />
  );
}
