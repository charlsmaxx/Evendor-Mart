"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountAvatarUpload } from "@/components/account/account-avatar-upload";
import { createClient } from "@/lib/supabase/client";
import { reportClientError } from "@/lib/client-error";
import { Save, Trash2 } from "lucide-react";

type MeData = {
  id: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  role: string;
  isVendor?: boolean;
};

export function AccountSettingsForm() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Failed to load account");
      const json = await res.json();
      return json.data as MeData;
    },
  });

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!me || hydrated) return;
    setFullName(me.fullName ?? "");
    setAvatarUrl(me.avatarUrl);
    setHydrated(true);
  }, [me, hydrated]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ fullName: fullName.trim(), avatarUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not save profile");
      return json.data as MeData;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], data);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      router.refresh();
    },
    onError: (e) => reportClientError("account", e),
  });

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!me?.email) return;
    if (newPassword.length < 8) {
      reportClientError("account", "New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      reportClientError("account", "New passwords do not match.");
      return;
    }
    setPasswordLoading(true);
    setPasswordSuccess(false);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: me.email,
        password: currentPassword,
      });
      if (signInError) {
        reportClientError("account", "Current password is incorrect.");
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        reportClientError("account", updateError.message);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(true);
    } catch (err) {
      reportClientError("account", err instanceof Error ? err.message : "Password update failed");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function deleteAccount() {
    if (deleteConfirm !== "DELETE") {
      reportClientError("account", 'Type DELETE to confirm account deletion.');
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/me", {
        method: "DELETE",
        credentials: "same-origin",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        reportClientError("account", json?.error?.message ?? "Could not delete account");
        return;
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      queryClient.clear();
      router.push("/");
      router.refresh();
    } catch (err) {
      reportClientError("account", err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  }

  if (isLoading || !me) {
    return <p className="text-sm text-muted-foreground">Loading account…</p>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Edit profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your name, password, and profile picture.
        </p>
      </div>

      <section className="space-y-5 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold">Profile details</h2>
        <AccountAvatarUpload
          value={avatarUrl}
          onChange={setAvatarUrl}
          name={fullName || me.fullName || me.email}
        />
        <div className="space-y-2">
          <Label htmlFor="fullName">Name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={me.email} disabled className="opacity-60" />
        </div>
        <Button
          variant="gradient"
          className="gap-2"
          disabled={saveProfile.isPending || fullName.trim().length < 2}
          onClick={() => saveProfile.mutate()}
        >
          <Save className="h-4 w-4" />
          {saveProfile.isPending ? "Saving…" : "Save profile"}
        </Button>
        {saveProfile.isSuccess && (
          <p className="text-sm text-emerald-600">Profile updated.</p>
        )}
      </section>

      <section className="space-y-5 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold">Change password</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <Button type="submit" variant="outline" disabled={passwordLoading}>
            {passwordLoading ? "Updating…" : "Update password"}
          </Button>
          {passwordSuccess && (
            <p className="text-sm text-emerald-600">Password updated successfully.</p>
          )}
        </form>
      </section>

      <section className="space-y-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="font-semibold text-destructive">Delete account</h2>
        <p className="text-sm text-muted-foreground">
          This permanently deletes your Evendor account and associated data. This cannot be undone.
        </p>
        <div className="space-y-2">
          <Label htmlFor="deleteConfirm">Type DELETE to confirm</Label>
          <Input
            id="deleteConfirm"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="DELETE"
          />
        </div>
        <Button
          variant="destructive"
          className="gap-2"
          disabled={deleteLoading || deleteConfirm !== "DELETE"}
          onClick={deleteAccount}
        >
          <Trash2 className="h-4 w-4" />
          {deleteLoading ? "Deleting…" : "Delete account"}
        </Button>
      </section>
    </div>
  );
}
