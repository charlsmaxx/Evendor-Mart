/** Transactional email via Resend REST API. No-ops when RESEND_API_KEY is unset. */

export function isEmailConfigured(): boolean {
  const key = process.env.RESEND_API_KEY?.trim();
  return !!key && !key.includes("xxx") && !key.startsWith("your-");
}

export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ sent: boolean; id?: string }> {
  if (!isEmailConfigured()) return { sent: false };

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ?? "Evendor <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html ?? params.text.replace(/\n/g, "<br/>"),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Resend request failed");
  }

  const data = (await res.json()) as { id?: string };
  return { sent: true, id: data.id };
}
