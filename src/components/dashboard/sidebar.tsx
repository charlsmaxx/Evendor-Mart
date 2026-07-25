"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMessageBadgeCount, MessageNotificationBadge } from "@/components/messages/message-notification-badge";

export function DashboardSidebar({
  links,
  title,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  const unreadCount = useMessageBadgeCount();

  return (
    <aside className="glass w-full shrink-0 rounded-2xl p-4 lg:w-56">
      <p className="mb-4 font-display font-semibold">{title}</p>
      <nav className="flex flex-row flex-wrap gap-2 lg:flex-col">
        {links.map((l) => {
          const isMessages = l.href === "/messages" || l.href === "/admin/messages";
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "relative rounded-lg px-3 py-2 text-sm transition",
                pathname === l.href || pathname.startsWith(`${l.href}/`)
                  ? "bg-primary/20 text-foreground"
                  : "text-muted-foreground hover:bg-white/5"
              )}
            >
              {l.label}
              {isMessages && (
                <MessageNotificationBadge
                  count={unreadCount}
                  className="-right-0.5 -top-1"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
