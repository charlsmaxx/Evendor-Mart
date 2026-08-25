import { NextRequest } from "next/server";
import { jsonError } from "@/lib/api-response";
import { HTTP_CACHE } from "@/lib/cache-policy";
import { logStructuredWarn } from "@/lib/observability";
import {
  buildAuthEmail,
  normalizeAuthEmailAction,
} from "@/lib/auth-emails";
import { isEmailConfigured, sendTransactionalEmail } from "@/lib/email";
import {
  isSendEmailHookSecretConfigured,
  verifyStandardWebhook,
} from "@/lib/standard-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

type SendEmailHookPayload = {
  user?: { email?: string };
  email_data?: {
    token?: string;
    token_hash?: string;
    redirect_to?: string;
    email_action_type?: string;
  };
};

/**
 * Supabase Auth Send Email hook.
 * Dashboard: Authentication → Hooks → Send Email → HTTPS endpoint
 * URL: {NEXT_PUBLIC_APP_URL}/api/auth/send-email
 */
export async function POST(req: NextRequest) {
  if (!isSendEmailHookSecretConfigured()) {
    return jsonError("Send Email hook is not configured", 503, "HOOK_UNCONFIGURED");
  }
  if (!isEmailConfigured()) {
    return jsonError("Resend is not configured", 503, "EMAIL_UNCONFIGURED");
  }

  const payload = await req.text();
  if (Buffer.byteLength(payload) > MAX_BODY_BYTES) {
    return jsonError("Payload too large", 413);
  }

  try {
    verifyStandardWebhook(payload, req.headers, process.env.SEND_EMAIL_HOOK_SECRET!);
  } catch (error) {
    logStructuredWarn("auth_send_email_bad_signature", {
      message: error instanceof Error ? error.message : "invalid",
    });
    return Response.json(
      { error: { http_code: 401, message: "Invalid webhook signature" } },
      { status: 401, headers: HTTP_CACHE.privateNoStore }
    );
  }

  let body: SendEmailHookPayload;
  try {
    body = JSON.parse(payload) as SendEmailHookPayload;
  } catch {
    return jsonError("Malformed payload", 400);
  }

  const to = body.user?.email?.trim();
  const actionType = body.email_data?.email_action_type ?? "";
  const action = normalizeAuthEmailAction(actionType);
  if (!to || !action) {
    return jsonError("Unsupported or incomplete email hook payload", 400);
  }

  const email = buildAuthEmail({
    action,
    token: body.email_data?.token,
    tokenHash: body.email_data?.token_hash,
    redirectTo: body.email_data?.redirect_to,
  });

  try {
    await sendTransactionalEmail({
      to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
  } catch (error) {
    logStructuredWarn("auth_send_email_resend_failed", {
      action,
      message: error instanceof Error ? error.message : "unknown",
    });
    return Response.json(
      {
        error: {
          http_code: 500,
          message: "Failed to send email",
        },
      },
      { status: 500, headers: HTTP_CACHE.privateNoStore }
    );
  }

  return Response.json({}, { status: 200, headers: HTTP_CACHE.privateNoStore });
}
