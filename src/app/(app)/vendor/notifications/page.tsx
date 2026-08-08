import { redirect } from "next/navigation";

/** Notifications are shared across all roles at /notifications. */
export default function VendorNotificationsRedirect() {
  redirect("/notifications");
}
