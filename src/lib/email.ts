import "server-only";

const PLACEHOLDER_KEYS = ["xxx", "your-", "changeme", "re_your"];

/** Transactional email via Resend REST API. No-ops when RESEND_API_KEY is unset. */

export function isEmailConfigured(): boolean {
  const key = getResendApiKey();
  return !!key && !PLACEHOLDER_KEYS.some((part) => key.toLowerCase().includes(part));
}

function getResendApiKey() {
  const serverKey = process.env.RESEND_API_KEY?.trim();
  if (serverKey) return serverKey;
  const publicKey = process.env.NEXT_PUBLIC_RESEND_API_KEY?.trim();
  if (publicKey) {
    console.warn(
      "[Evendor:email] Move the Resend key to RESEND_API_KEY. NEXT_PUBLIC_RESEND_API_KEY is exposed to the browser."
    );
    return publicKey;
  }
  return "";
}

/** Display name is always Evendor unless RESEND_FROM_EMAIL already includes one. */
export function getResendFromAddress() {
  const configured = process.env.RESEND_FROM_EMAIL?.trim();
  if (configured) {
    return configured.includes("<") ? configured : `Evendor <${configured}>`;
  }
  return "Evendor <onboarding@resend.dev>";
}

export function getResendReplyTo() {
  return process.env.RESEND_REPLY_TO?.trim() || "hello@evendor.ng";
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderEvendorEmail(input: {
  heading: string;
  paragraphs: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  code?: string;
  footerNote?: string;
}): { html: string; text: string } {
  const heading = escapeHtml(input.heading);
  const paragraphs = input.paragraphs.map((p) => escapeHtml(p));
  const ctaLabel = input.ctaLabel ? escapeHtml(input.ctaLabel) : "";
  const ctaUrl = input.ctaUrl ? escapeHtml(input.ctaUrl) : "";
  const code = input.code ? escapeHtml(input.code) : "";
  const footer =
    input.footerNote ??
    "If you didn’t request this, you can ignore this email. Evendor will never ask for your password.";

  const paragraphHtml = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#3f2a30;">${p}</p>`
    )
    .join("");

  const ctaHtml =
    ctaUrl && ctaLabel
      ? `<p style="margin:28px 0 8px;text-align:center;">
          <a href="${ctaUrl}" style="display:inline-block;background:#A12A4A;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px;">
            ${ctaLabel}
          </a>
        </p>
        <p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:#7a5a62;word-break:break-all;">${escapeHtml(input.ctaUrl ?? "")}</p>`
      : "";

  const codeHtml = code
    ? `<p style="margin:20px 0;text-align:center;letter-spacing:0.28em;font-size:28px;font-weight:700;color:#A12A4A;">${code}</p>`
    : "";

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f6f1ea;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f1ea;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #eadfd6;">
            <tr>
              <td style="background:#A12A4A;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.02em;">
                Evendor
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#3f1220;">${heading}</h1>
                ${paragraphHtml}
                ${codeHtml}
                ${ctaHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px;font-size:12px;line-height:1.5;color:#7a5a62;">
                ${escapeHtml(footer)}
                <br/>Africa’s premium event marketplace
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textParts = [input.heading, "", ...input.paragraphs];
  if (input.code) textParts.push("", `Code: ${input.code}`);
  if (input.ctaUrl) textParts.push("", input.ctaLabel ? `${input.ctaLabel}: ${input.ctaUrl}` : input.ctaUrl);
  textParts.push("", footer, "— Evendor");

  return { html, text: textParts.join("\n") };
}

export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ sent: boolean; id?: string }> {
  if (!isEmailConfigured()) return { sent: false };

  const from = getResendFromAddress();
  const replyTo = getResendReplyTo();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getResendApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html ?? params.text.replace(/\n/g, "<br/>"),
      reply_to: replyTo,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Resend request failed");
  }

  const data = (await res.json()) as { id?: string };
  return { sent: true, id: data.id };
}
