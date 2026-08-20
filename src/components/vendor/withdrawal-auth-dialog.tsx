"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Fingerprint, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

export type WebauthnAssertionPayload = {
  credentialId: string;
  authenticatorData: string;
  clientDataJSON: string;
  signature: string;
};

type Mode = "set" | "confirm" | "change" | "recover" | "enable-biometrics";

type Props = {
  open: boolean;
  amount: number;
  passwordSet: boolean;
  webauthnEnabled: boolean;
  submitting: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSetPassword: (password: string, confirmPassword: string) => Promise<void>;
  onChangePassword: (currentPassword: string, password: string, confirmPassword: string) => Promise<void>;
  onRecoverPassword: (accountPassword: string, password: string, confirmPassword: string) => Promise<void>;
  onConfirmPassword: (password: string) => Promise<void>;
  onConfirmBiometrics: (assertion: WebauthnAssertionPayload) => Promise<void>;
  onBiometricsEnabled: () => void;
};

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBuffer(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * iOS Safari often reports `isUserVerifyingPlatformAuthenticatorAvailable() === false`
 * even when Face ID WebAuthn works. If PublicKeyCredential exists in a secure context,
 * offer biometrics and let the device prompt (or fail with a clear error).
 */
function webauthnSupported() {
  if (typeof window === "undefined") return false;
  if (!window.isSecureContext) return false;
  return typeof window.PublicKeyCredential === "function";
}

async function beginWebauthn(action: "register-begin" | "assert-begin", password?: string) {
  const res = await fetch("/api/vendor/payout-auth/webauthn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, password }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error?.message ?? "Could not start biometric verification.");
  }
  return json.data as {
    challenge: string;
    rp?: { name: string; id: string };
    user?: { id: string; name: string; displayName: string };
    rpId?: string;
    credentialId?: string | null;
    credentialIds?: string[];
  };
}

export function WithdrawalAuthDialog({
  open,
  amount,
  passwordSet,
  webauthnEnabled,
  submitting,
  error,
  onOpenChange,
  onSetPassword,
  onChangePassword,
  onRecoverPassword,
  onConfirmPassword,
  onConfirmBiometrics,
  onBiometricsEnabled,
}: Props) {
  const [mode, setMode] = useState<Mode>(passwordSet ? "confirm" : "set");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [canUseBiometrics, setCanUseBiometrics] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode(passwordSet ? "confirm" : "set");
    setPassword("");
    setConfirmPassword("");
    setCurrentPassword("");
    setAccountPassword("");
    setLocalError(null);
    setCanUseBiometrics(webauthnSupported());
    // Reset only when the dialog opens so saving a password mid-flow does not wipe the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- passwordSet is read at open time
  }, [open]);

  const working = submitting || busy;
  const shownError = localError ?? error;
  const showEnableBiometrics = canUseBiometrics;
  const showUseBiometrics = canUseBiometrics && webauthnEnabled;

  async function handleSet() {
    setLocalError(null);
    if (password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await onSetPassword(password, confirmPassword);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not save withdrawal password.");
    } finally {
      setBusy(false);
    }
  }

  async function handleChange() {
    setLocalError(null);
    if (password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await onChangePassword(currentPassword, password, confirmPassword);
      setMode("confirm");
      setPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not update withdrawal password.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRecover() {
    setLocalError(null);
    if (password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await onRecoverPassword(accountPassword, password, confirmPassword);
      setMode("confirm");
      setPassword("");
      setConfirmPassword("");
      setAccountPassword("");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not reset withdrawal password.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    setLocalError(null);
    try {
      await onConfirmPassword(password);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Withdrawal failed.");
    }
  }

  async function handleBiometrics() {
    setLocalError(null);
    setBusy(true);
    try {
      const options = await beginWebauthn("assert-begin");
      const ids = options.credentialIds?.length
        ? options.credentialIds
        : options.credentialId
          ? [options.credentialId]
          : [];
      if (ids.length === 0) {
        throw new Error("Enable fingerprint / Face ID on this phone first, or use your withdrawal password.");
      }
      const cred = (await navigator.credentials.get({
        publicKey: {
          challenge: base64UrlToBuffer(options.challenge),
          rpId: options.rpId,
          allowCredentials: ids.map((id) => ({
            type: "public-key" as const,
            id: base64UrlToBuffer(id),
            transports: ["internal", "hybrid"],
          })),
          userVerification: "required",
          timeout: 60_000,
        },
      })) as PublicKeyCredential | null;
      if (!cred) throw new Error("Biometric verification was cancelled.");
      const response = cred.response as AuthenticatorAssertionResponse;
      await onConfirmBiometrics({
        credentialId: bufferToBase64Url(cred.rawId),
        authenticatorData: bufferToBase64Url(response.authenticatorData),
        clientDataJSON: bufferToBase64Url(response.clientDataJSON),
        signature: bufferToBase64Url(response.signature),
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Biometric verification failed.");
    } finally {
      setBusy(false);
    }
  }

  async function createPlatformCredential(options: {
    challenge: string;
    rp: { name: string; id: string };
    user: { id: string; name: string; displayName: string };
  }) {
    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge: base64UrlToBuffer(options.challenge),
      rp: options.rp,
      user: {
        id: new TextEncoder().encode(options.user.id),
        name: options.user.name,
        displayName: options.user.displayName,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60_000,
      attestation: "none",
    };

    try {
      return (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
    } catch {
      const { authenticatorAttachment: _ignored, ...selection } = publicKey.authenticatorSelection!;
      return (await navigator.credentials.create({
        publicKey: { ...publicKey, authenticatorSelection: selection },
      })) as PublicKeyCredential | null;
    }
  }

  async function handleEnableBiometrics() {
    setLocalError(null);
    setBusy(true);
    try {
      const options = await beginWebauthn("register-begin", password);
      if (!options.rp || !options.user) {
        throw new Error("Could not start biometric setup.");
      }
      const cred = await createPlatformCredential({
        challenge: options.challenge,
        rp: options.rp,
        user: options.user,
      });
      if (!cred) throw new Error("Biometric setup was cancelled.");
      const att = cred.response as AuthenticatorAttestationResponse;
      if (typeof att.getPublicKey !== "function" || typeof att.getAuthenticatorData !== "function") {
        throw new Error("This browser cannot save a biometric key. Use your withdrawal password.");
      }
      const publicKey = att.getPublicKey();
      if (!publicKey) {
        throw new Error("This device did not return a biometric key. Use your withdrawal password.");
      }
      const res = await fetch("/api/vendor/payout-auth/webauthn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register-finish",
          password,
          credentialId: bufferToBase64Url(cred.rawId),
          publicKeyDer: bufferToBase64Url(publicKey),
          clientDataJSON: bufferToBase64Url(att.clientDataJSON),
          authenticatorData: bufferToBase64Url(att.getAuthenticatorData()),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message ?? "Could not enable biometrics.");
      }
      onBiometricsEnabled();
      setMode("confirm");
      setPassword("");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not enable biometrics.");
    } finally {
      setBusy(false);
    }
  }

  const titles: Record<Mode, string> = {
    set: "Set a withdrawal password",
    confirm: "Confirm withdrawal",
    change: "Change withdrawal password",
    recover: "Reset withdrawal password",
    "enable-biometrics": "Enable fingerprint or Face ID",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {titles[mode]}
          </DialogTitle>
        </DialogHeader>

        {mode === "set" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Before sending {formatCurrency(amount)} to your bank, set a withdrawal password.
              You can also enable this phone&apos;s fingerprint or Face ID after that.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="payout-password-new">Withdrawal password</Label>
              <Input
                id="payout-password-new"
                type="password"
                autoComplete="new-password"
                minLength={6}
                maxLength={32}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6–32 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payout-password-confirm">Confirm password</Label>
              <Input
                id="payout-password-confirm"
                type="password"
                autoComplete="new-password"
                minLength={6}
                maxLength={32}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
        )}

        {mode === "confirm" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Confirm you want to withdraw <span className="font-semibold text-foreground">{formatCurrency(amount)}</span>{" "}
              to your payout account.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="payout-password">Withdrawal password</Label>
              <Input
                id="payout-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && password.length >= 6 && !working) void handleConfirm();
                }}
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {showUseBiometrics && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={working}
                  onClick={() => void handleBiometrics()}
                >
                  <Fingerprint className="mr-2 h-4 w-4" />
                  Use fingerprint / Face ID
                </Button>
              )}
              {showEnableBiometrics && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={working}
                  onClick={() => {
                    setLocalError(null);
                    setMode("enable-biometrics");
                  }}
                >
                  <Fingerprint className="mr-2 h-4 w-4" />
                  Enable fingerprint / Face ID on this device
                </Button>
              )}
            </div>
            {!canUseBiometrics && (
              <p className="text-xs text-muted-foreground">
                Fingerprint / Face ID is available in Safari or Chrome over HTTPS. On this
                connection, confirm with your withdrawal password.
              </p>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <button
                type="button"
                className="min-h-11 text-primary underline-offset-2 hover:underline sm:min-h-0"
                onClick={() => {
                  setLocalError(null);
                  setMode("change");
                }}
              >
                Change password
              </button>
              <button
                type="button"
                className="min-h-11 text-primary underline-offset-2 hover:underline sm:min-h-0"
                onClick={() => {
                  setLocalError(null);
                  setMode("recover");
                }}
              >
                Forgot withdrawal password?
              </button>
            </div>
          </div>
        )}

        {mode === "change" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="payout-password-current">Current withdrawal password</Label>
              <Input
                id="payout-password-current"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payout-password-updated">New withdrawal password</Label>
              <Input
                id="payout-password-updated"
                type="password"
                autoComplete="new-password"
                minLength={6}
                maxLength={32}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payout-password-updated-confirm">Confirm new password</Label>
              <Input
                id="payout-password-updated-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="min-h-11 text-left text-xs text-primary underline-offset-2 hover:underline sm:min-h-0"
              onClick={() => {
                setLocalError(null);
                setMode("recover");
              }}
            >
              Forgot current withdrawal password?
            </button>
          </div>
        )}

        {mode === "recover" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Confirm your Evendor login password, then choose a new withdrawal password.
              This does not change your login password.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="account-password">Evendor login password</Label>
              <Input
                id="account-password"
                type="password"
                autoComplete="current-password"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payout-password-recovered">New withdrawal password</Label>
              <Input
                id="payout-password-recovered"
                type="password"
                autoComplete="new-password"
                minLength={6}
                maxLength={32}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payout-password-recovered-confirm">Confirm new withdrawal password</Label>
              <Input
                id="payout-password-recovered-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Forgot your Evendor login password too?{" "}
              <Link href="/forgot-password" className="text-primary underline-offset-2 hover:underline">
                Reset it first
              </Link>
              , then return here.
            </p>
          </div>
        )}

        {mode === "enable-biometrics" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enter your withdrawal password, then use this device&apos;s fingerprint or Face ID.
              Each phone or computer must be enabled separately.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="payout-password-bio">Withdrawal password</Label>
              <Input
                id="payout-password-bio"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
        )}

        {shownError && <p className="text-sm text-red-600">{shownError}</p>}

        <DialogFooter>
          {mode === "set" && (
            <Button
              variant="gradient"
              disabled={working || password.length < 6 || confirmPassword.length < 6}
              onClick={() => void handleSet()}
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              {working ? "Saving…" : "Save and continue"}
            </Button>
          )}
          {mode === "confirm" && (
            <Button variant="gradient" disabled={working || password.length < 6} onClick={() => void handleConfirm()}>
              {working ? "Processing payout…" : "Confirm withdrawal"}
            </Button>
          )}
          {mode === "change" && (
            <Button
              variant="gradient"
              disabled={working || currentPassword.length < 6 || password.length < 6}
              onClick={() => void handleChange()}
            >
              {working ? "Updating…" : "Update password"}
            </Button>
          )}
          {mode === "recover" && (
            <Button
              variant="gradient"
              disabled={working || accountPassword.length < 6 || password.length < 6}
              onClick={() => void handleRecover()}
            >
              {working ? "Resetting…" : "Reset withdrawal password"}
            </Button>
          )}
          {mode === "enable-biometrics" && (
            <Button variant="gradient" disabled={working || password.length < 6} onClick={() => void handleEnableBiometrics()}>
              <Fingerprint className="mr-2 h-4 w-4" />
              {working ? "Waiting for device…" : "Enable biometrics"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
