"use client";

import { memo } from "react";
import Link from "next/link";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Pin, PinOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { messagePreview } from "@/lib/message-preview";
import { Button } from "@/components/ui/button";
import type { ConversationListItem } from "@/components/messages/conversation-list";

export const ConversationListRow = memo(function ConversationListRow({
  conversation: c,
  active,
  basePath,
  onTogglePin,
  pinning,
}: {
  conversation: ConversationListItem;
  active: boolean;
  basePath: string;
  onTogglePin?: (conversationId: string, pinned: boolean) => void;
  pinning: boolean;
}) {
  const pinned = !!c.pinnedAt;

  return (
    <div
      className={cn(
        "flex items-center gap-1 border-b border-border/60 transition-colors hover:bg-muted/50",
        active && "bg-muted"
      )}
    >
      <Link href={`${basePath}/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-primary/10">
          {c.peerAvatar ? (
            <OptimizedImage
              src={c.peerAvatar}
              preset="avatarSm"
              alt={c.peerName}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-semibold text-primary">
              {c.peerName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1 truncate font-semibold">
              {pinned && <Pin className="h-3 w-3 shrink-0 text-primary" />}
              {c.peerName}
            </p>
            {c.lastMessage && (
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {new Date(c.lastMessage.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
          {c.listing?.title && (
            <p className="truncate text-xs text-muted-foreground">{c.listing.title}</p>
          )}
          <p className="truncate text-sm text-muted-foreground">
            {messagePreview(c.lastMessage ?? undefined)}
          </p>
        </div>
      </Link>
      {onTogglePin && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mr-2 shrink-0"
          disabled={pinning}
          onClick={() => onTogglePin(c.id, !pinned)}
          title={pinned ? "Unpin conversation" : "Pin conversation"}
        >
          {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
});
