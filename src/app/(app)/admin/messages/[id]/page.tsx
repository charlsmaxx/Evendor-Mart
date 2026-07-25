import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { AdminMessagesShell } from "@/components/messages/admin-messages-shell";

export default async function AdminConversationPage() {
  const user = await requireAuth();
  if (!user) redirect("/login?redirect=/admin/messages");
  try {
    await requireRole(user.id, ["ADMIN"]);
  } catch {
    redirect("/marketplace");
  }
  return <AdminMessagesShell currentUserId={user.id} />;
}
