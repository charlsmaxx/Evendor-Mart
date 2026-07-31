import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { AccountSettingsForm } from "@/components/account/account-settings-form";

export const metadata = {
  title: "Edit profile",
};

export default async function AccountPage() {
  const user = await requireAuth();
  if (!user) redirect("/login?redirect=/account");

  return <AccountSettingsForm />;
}
