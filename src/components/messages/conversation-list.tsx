"use client";

import Link from "next/link";
import { messagePreview } from "@/lib/message-preview";
import { ConversationListRow } from "@/components/messages/conversation-list-item";

export interface ConversationListItem {
  id: string;
  peerName: string;
  peerAvatar?: string | null;
  listing?: { title: string } | null;
  asVendor?: boolean;
  updatedAt: string;
  pinnedAt?: string | null;
  lastMessage?: {
    body: string;
    type: string;
    mediaUrl?: string | null;
    createdAt: string;
  } | null;
}

export interface MessageSearchHit {
  conversationId: string;
  peerName: string;
  listingTitle?: string | null;
  message: {
    id: string;
    body: string;
    type: string;
    createdAt: string;
  };
}

export function ConversationList({
  conversations,
  activeId,
  basePath = "/messages",
  onTogglePin,
  pinningId,
  searchResults,
  searchQuery,
  searchLoading,
}: {
  conversations: ConversationListItem[];
  activeId?: string;
  basePath?: string;
  onTogglePin?: (conversationId: string, pinned: boolean) => void;
  pinningId?: string | null;
  searchResults?: MessageSearchHit[];
  searchQuery?: string;
  searchLoading?: boolean;
}) {
  if (searchQuery && searchQuery.length >= 2) {
    if (searchLoading) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
          <p className="font-medium">Searching…</p>
        </div>
      );
    }
    if (!searchResults?.length) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
          <p className="font-medium">No messages found</p>
          <p className="mt-1 text-sm">Try a different search term.</p>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto">
        {searchResults.map((hit) => (
          <Link
            key={`${hit.conversationId}-${hit.message.id}`}
            href={`${basePath}/${hit.conversationId}`}
            className="block border-b border-border/60 px-4 py-3 transition-colors hover:bg-muted/50"
          >
            <p className="truncate font-semibold">{hit.peerName}</p>
            {hit.listingTitle && (
              <p className="truncate text-xs text-muted-foreground">{hit.listingTitle}</p>
            )}
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {messagePreview(hit.message)}
            </p>
          </Link>
        ))}
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <p className="font-medium">No conversations yet</p>
        <p className="mt-1 text-sm">Message a vendor from their profile to start chatting.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((c) => (
        <ConversationListRow
          key={c.id}
          conversation={c}
          active={c.id === activeId}
          basePath={basePath}
          onTogglePin={onTogglePin}
          pinning={pinningId === c.id}
        />
      ))}
    </div>
  );
}
