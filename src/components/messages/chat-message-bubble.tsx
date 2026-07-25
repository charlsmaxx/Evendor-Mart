"use client";

import { memo } from "react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Check, CheckCheck, FileText, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessagePayload } from "@/lib/messages-access";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export const ChatMessageBubble = memo(function ChatMessageBubble({
  message: m,
  isMine,
}: {
  message: MessagePayload;
  isMine: boolean;
}) {
  const isAdmin = m.type === "ADMIN" || m.sender?.role === "ADMIN";
  const isRead = !!m.readAt;

  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative max-w-[85%] rounded-2xl px-3 py-2 shadow-sm sm:max-w-[70%]",
          isAdmin && "border border-amber-300 bg-amber-50 text-amber-950",
          !isAdmin && isMine && "rounded-br-md bg-primary text-primary-foreground",
          !isAdmin && !isMine && "rounded-bl-md bg-card"
        )}
      >
        {isAdmin && (
          <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            <Shield className="h-3 w-3" /> Evendor Admin
          </p>
        )}
        {!isMine && !isAdmin && m.sender?.fullName && (
          <p className="mb-1 text-[11px] font-medium text-primary">{m.sender.fullName}</p>
        )}

        {m.type === "DOCUMENT" && m.mediaUrl && (
          <a
            href={m.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "mb-1 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm",
              isMine && !isAdmin
                ? "border-primary-foreground/30 bg-primary-foreground/10"
                : "border-border bg-muted/40"
            )}
          >
            <FileText className="h-5 w-5 shrink-0" />
            <span className="truncate">{m.body.trim() || "Document"}</span>
          </a>
        )}

        {m.type === "IMAGE" && m.mediaUrl && (
          <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" className="block">
            <div className="relative mb-1 max-h-72 min-h-[120px] w-full min-w-[200px] overflow-hidden rounded-xl">
              <OptimizedImage
                src={m.mediaUrl}
                preset="chat"
                alt="Shared image"
                width={320}
                height={240}
                className="h-auto max-h-72 w-full object-cover"
                loading="lazy"
              />
            </div>
          </a>
        )}

        {m.body.trim() && m.type !== "DOCUMENT" && (
          <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
        )}

        <p
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[10px]",
            isMine && !isAdmin ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {formatTime(m.createdAt)}
          {isMine && !isAdmin && (
            isRead ? (
              <CheckCheck className="h-3 w-3" aria-label="Read" />
            ) : (
              <Check className="h-3 w-3" aria-label="Sent" />
            )
          )}
        </p>
      </div>
    </div>
  );
});
