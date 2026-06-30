import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Server-side COMPLETION of a Pi payment (step 2 of the User-to-App flow).
 *
 * Called by the frontend from Pi.createPayment's onReadyForServerCompletion with
 * { paymentId, txid }. Uses the SECRET PI_API_KEY to call the official Pi
 * Platform API:
 *
 *   POST https://api.minepi.com/v2/payments/{paymentId}/complete
 *   Header: Authorization: Key <PI_API_KEY>
 *   Body:   { "txid": "<txid>" }
 */
const PI_API_BASE_URL = "https://api.minepi.com/v2";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { paymentId, txid } = (req.body ?? {}) as {
    paymentId?: string;
    txid?: string;
  };
  if (!paymentId || typeof paymentId !== "string") {
    return res.status(400).json({ error: "Missing paymentId" });
  }
  if (!txid || typeof txid !== "string") {
    return res.status(400).json({ error: "Missing txid" });
  }

  const apiKey = process.env.PI_API_KEY;
  if (!apiKey) {
    console.error("[Pi complete] PI_API_KEY is not set");
    return res
      .status(500)
      .json({ error: "Missing PI_API_KEY server environment variable" });
  }

  try {
    const piResponse = await fetch(
      `${PI_API_BASE_URL}/payments/${encodeURIComponent(paymentId)}/complete`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txid }),
      },
    );

    const text = await piResponse.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!piResponse.ok) {
      console.error("[Pi complete] Pi API error", piResponse.status, data);
      return res.status(piResponse.status).json({
        error: "Pi payment completion failed",
        status: piResponse.status,
        details: data,
      });
    }

    return res.status(200).json({ ok: true, payment: data });
  } catch (error) {
    console.error("[Pi complete] server error:", error);
    return res
      .status(500)
      .json({ error: "Server error during Pi payment completion" });
  }
}
