import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { MessagesShell } from "@/components/messages/messages-shell";

export default async function ConversationPage() {
  const user = await requireAuth();
  if (!user) redirect("/login?redirect=/messages");
  return <MessagesShell currentUserId={user.id} />;
}
