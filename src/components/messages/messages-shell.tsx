"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ConversationList,
  type MessageSearchHit,
} from "@/components/messages/conversation-list";
import { Input } from "@/components/ui/input";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { MessageSquare, Search } from "lucide-react";
import { parseApiResponse } from "@/lib/parse-api-response";
import { parsePaginatedApiResponse } from "@/lib/parse-paginated-api-response";
import type { ConversationListItem } from "@/components/messages/conversation-list";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { MessagePayload } from "@/lib/messages-access";
import type { ChatRelatedBooking, ChatBookListing } from "@/components/messages/chat-booking-banner";

const ChatPanel = dynamic(
  () => import("@/components/messages/chat-panel").then((m) => ({ default: m.ChatPanel })),
  {
    loading: () => (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">Loading chat…</div>
    ),
  }
);

type ThreadData = {
  peerName: string;
  peerAvatar: string | null;
  messages: MessagePayload[];
  hasMore: boolean;
  nextCursor: string | null;
  relatedBooking?: ChatRelatedBooking | null;
  bookListing?: ChatBookListing | null;
};

export function MessagesShell({ currentUserId }: { currentUserId: string }) {
  const params = useParams();
  const activeId = typeof params?.id === "string" ? params.id : undefined;
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 350);
  const [pinningId, setPinningId] = useState<string | null>(null);

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["conversations"],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await fetch(`/api/messages?page=${pageParam}&limit=30`);
      const parsed = await parsePaginatedApiResponse<ConversationListItem>(res);
      if (!parsed.ok) throw new Error(parsed.message);
      return { items: parsed.data, meta: parsed.meta! };
    },
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore ? lastPage.meta.page + 1 : undefined,
    staleTime: 30_000,
  });

  const conversations = data?.pages.flatMap((page) => page.items) ?? [];
  const lastMeta = data?.pages[data.pages.length - 1]?.meta;

  const { data: searchResults = [], isFetching: searchLoading } = useQuery({
    queryKey: ["message-search", debouncedSearchQuery],
    enabled: debouncedSearchQuery.trim().length >= 2,
    queryFn: async () => {
      const res = await fetch(
        `/api/messages/search?q=${encodeURIComponent(debouncedSearchQuery.trim())}`
      );
      const parsed = await parseApiResponse<MessageSearchHit[]>(res);
      if (!parsed.ok) return [];
      return parsed.data ?? [];
    },
    staleTime: 15_000,
  });

  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ["conversation", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const res = await fetch(`/api/messages/${activeId}`);
      const parsed = await parseApiResponse<ThreadData>(res);
      if (!parsed.ok) throw new Error(parsed.message);
      return parsed.data;
    },
    staleTime: 15_000,
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      setPinningId(id);
      const res = await fetch(`/api/messages/${id}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not update pin");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onSettled: () => setPinningId(null),
  });

  return (
    <div className="flex h-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <aside
        className={`flex w-full flex-col border-r border-border bg-card md:w-96 md:max-w-[40%] ${
          activeId ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="border-b border-border px-4 py-4">
          <h1 className="font-display text-xl font-bold">Chats</h1>
          <p className="text-sm text-muted-foreground">Message vendors about your event</p>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages…"
              className="rounded-full pl-9"
            />
          </div>
        </div>
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          searchQuery={debouncedSearchQuery}
          searchLoading={searchLoading && searchQuery.trim().length >= 2}
          searchResults={searchResults}
          pinningId={pinningId}
          onTogglePin={(id, pinned) => togglePin.mutate({ id, pinned })}
        />
        <LoadMoreButton
          meta={hasNextPage ? lastMeta : null}
          onLoadMore={() => fetchNextPage()}
          loading={isFetchingNextPage || isLoading}
        />
      </aside>

      <section className={`flex min-w-0 flex-1 flex-col ${!activeId ? "hidden md:flex" : "flex"}`}>
        {activeId && thread && !threadLoading ? (
          <ChatPanel
            conversationId={activeId}
            currentUserId={currentUserId}
            peerName={thread.peerName}
            peerAvatar={thread.peerAvatar}
            initialMessages={thread.messages}
            initialHasMore={thread.hasMore}
            initialNextCursor={thread.nextCursor}
            relatedBooking={thread.relatedBooking ?? null}
            bookListing={thread.bookListing ?? null}
          />
        ) : activeId && threadLoading ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">Loading chat...</div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center bg-muted/20 p-8 text-center text-muted-foreground">
            <MessageSquare className="mb-4 h-12 w-12 opacity-40" />
            <p className="font-medium">Select a conversation</p>
            <p className="mt-1 max-w-sm text-sm">
              Choose a chat on the left or message a vendor from the marketplace to get started.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
