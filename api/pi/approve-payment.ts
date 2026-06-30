import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Server-side approval of a Pi payment (step 1 of the U2A flow).
 *
 * Called by the frontend from Pi.createPayment's onReadyForServerApproval.
 * Uses the SECRET PI_API_KEY (Vercel env, never shipped to the client) to call
 * the Pi Platform API.
 *
 * Pi Platform API (official): POST https://api.minepi.com/v2/payments/{id}/approve
 * Auth header format: "Authorization: Key <PI_API_KEY>".
 * VERIFY against the Pi Developer docs if the API base/path/header ever change.
 */
const PI_API_BASE = "https://api.minepi.com/v2";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.PI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing PI_API_KEY." });
    return;
  }

  const paymentId = (req.body as { paymentId?: string })?.paymentId;
  if (!paymentId) {
    res.status(400).json({ error: "Missing paymentId." });
    return;
  }

  try {
    const piRes = await fetch(`${PI_API_BASE}/payments/${paymentId}/approve`, {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const data = await piRes.json().catch(() => ({}));
    if (!piRes.ok) {
      res.status(piRes.status).json({ error: "Pi approve failed", detail: data });
      return;
    }

    res.status(200).json({ ok: true, payment: data });
  } catch (err) {
    res.status(502).json({ error: "Failed to reach Pi API", detail: String(err) });
  }
}
