import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Server-side APPROVAL of a Pi payment (step 1 of the User-to-App flow).
 *
 * Called by the frontend from Pi.createPayment's onReadyForServerApproval with
 * { paymentId }. Uses the SECRET PI_API_KEY (Vercel env, never shipped to the
 * client) to call the official Pi Platform API:
 *
 *   POST https://api.minepi.com/v2/payments/{paymentId}/approve
 *   Header: Authorization: Key <PI_API_KEY>   (no body needed)
 *
 * Pi re-invokes the callback (~every 10s) during the approval window, so if this
 * keeps failing the wallet eventually shows "payment expired / not approved".
 */
const PI_API_BASE_URL = "https://api.minepi.com/v2";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { paymentId } = (req.body ?? {}) as { paymentId?: string };
  if (!paymentId || typeof paymentId !== "string") {
    return res.status(400).json({ error: "Missing paymentId" });
  }

  const apiKey = process.env.PI_API_KEY;
  // Never log the key itself — only whether it is present.
  console.log("[Pi approve] endpoint called");
  console.log("[Pi approve] paymentId:", paymentId);
  console.log("[Pi approve] PI_API_KEY present:", Boolean(apiKey));

  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "Missing PI_API_KEY server environment variable" });
  }

  try {
    const piResponse = await fetch(
      `${PI_API_BASE_URL}/payments/${encodeURIComponent(paymentId)}/approve`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    const text = await piResponse.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    console.log("[Pi approve] Pi API status:", piResponse.status);

    if (!piResponse.ok) {
      console.error("[Pi approve] Pi API error body:", data);
      return res.status(piResponse.status).json({
        error: "Pi payment approval failed",
        status: piResponse.status,
        details: data,
      });
    }

    return res.status(200).json({ ok: true, payment: data });
  } catch (error) {
    console.error("[Pi approve] server error:", error);
    return res
      .status(500)
      .json({ error: "Server error during Pi payment approval" });
  }
}
