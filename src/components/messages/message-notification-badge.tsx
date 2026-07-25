"use client";

import { cn } from "@/lib/utils";
import { useUnreadMessageCount } from "@/hooks/use-unread-message-count";

export function MessageNotificationBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        "absolute flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground shadow-sm ring-2 ring-background",
        className
      )}
      aria-label={`${count} unread conversation${count === 1 ? "" : "s"}`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function useMessageBadgeCount() {
  const { data: count = 0 } = useUnreadMessageCount();
  return count;
}
