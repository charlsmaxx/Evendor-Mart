"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ConversationList, type ConversationListItem } from "@/components/messages/conversation-list";
import { Shield } from "lucide-react";

const ChatPanel = dynamic(
  () => import("@/components/messages/chat-panel").then((m) => ({ default: m.ChatPanel })),
  {
    loading: () => (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">Loading chat…</div>
    ),
  }
);

export function AdminMessagesShell({ currentUserId }: { currentUserId: string }) {
  const params = useParams();
  const activeId = typeof params?.id === "string" ? params.id : undefined;

  const { data: conversations = [] } = useQuery({
    queryKey: ["admin-conversations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/messages");
      const json = await res.json();
      return (json.data ?? []).map(
        (c: {
          id: string;
          peerName: string;
          customerName: string;
          vendorName: string;
          listing?: { title: string } | null;
          updatedAt: string;
          lastMessage?: ConversationListItem["lastMessage"];
        }) => ({
          id: c.id,
          peerName: c.peerName,
          listing: c.listing,
          updatedAt: c.updatedAt,
          lastMessage: c.lastMessage,
        })
      );
    },
    staleTime: 30_000,
  });

  const { data: thread, isLoading } = useQuery({
    queryKey: ["admin-conversation", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const res = await fetch(`/api/admin/messages/${activeId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to load chat");
      return json.data;
    },
    staleTime: 15_000,
  });

  const peerName = thread
    ? `${thread.customerName} ↔ ${thread.vendorName}`
    : "Conversation";

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[560px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <aside
        className={`flex w-full flex-col border-r border-border bg-card md:w-96 md:max-w-[40%] ${
          activeId ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="border-b border-border px-4 py-4">
          <h1 className="flex items-center gap-2 font-display text-xl font-bold">
            <Shield className="h-5 w-5 text-amber-600" /> Message oversight
          </h1>
          <p className="text-sm text-muted-foreground">
            View customer–vendor chats and send admin messages visible to both parties.
          </p>
        </div>
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          basePath="/admin/messages"
        />
      </aside>

      <section className={`flex min-w-0 flex-1 flex-col ${!activeId ? "hidden md:flex" : "flex"}`}>
        {activeId && thread && !isLoading ? (
          <ChatPanel
            conversationId={activeId}
            currentUserId={currentUserId}
            peerName={peerName}
            initialMessages={thread.messages}
            adminMode
          />
        ) : activeId && isLoading ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">Loading chat...</div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center bg-muted/20 p-8 text-center text-muted-foreground">
            <Shield className="mb-4 h-12 w-12 opacity-40" />
            <p className="font-medium">Select a conversation to monitor</p>
            <p className="mt-1 max-w-sm text-sm">
              Admin messages appear in the thread for both the customer and vendor.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
