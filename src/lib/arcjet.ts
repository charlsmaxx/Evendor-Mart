import arcjet, { detectBot, shield } from "@arcjet/next";

let aj: ReturnType<typeof arcjet> | null = null;

function getArcjet() {
  const key = process.env.ARCJET_KEY?.trim();
  if (!key || key.includes("xxx") || key.startsWith("ajkey_your")) return null;
  if (!aj) {
    aj = arcjet({
      key,
      rules: [
        shield({ mode: "LIVE" }),
        detectBot({ mode: "LIVE", allow: ["CATEGORY:SEARCH_ENGINE"] }),
      ],
    });
  }
  return aj;
}

/** Returns allowed=false when Arcjet blocks the request. No-ops when ARCJET_KEY is unset. */
export async function protectRequest(req?: Request) {
  const client = getArcjet();
  if (!client || !req) return { allowed: true as const };

  const decision = await client.protect(req);
  if (decision.isDenied()) {
    return { allowed: false as const, reason: decision.reason };
  }
  return { allowed: true as const };
}
