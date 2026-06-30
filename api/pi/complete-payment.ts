import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Server-side completion of a Pi payment (step 2 of the U2A flow).
 *
 * Called by the frontend from Pi.createPayment's onReadyForServerCompletion with
 * the on-chain transaction id (txid). Uses the SECRET PI_API_KEY.
 *
 * Pi Platform API (official): POST https://api.minepi.com/v2/payments/{id}/complete
 * Body: { "txid": "<txid>" }. Auth: "Authorization: Key <PI_API_KEY>".
 * VERIFY against the Pi Developer docs if the API base/path/body ever change.
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

  const { paymentId, txid } = (req.body as { paymentId?: string; txid?: string }) ?? {};
  if (!paymentId || !txid) {
    res.status(400).json({ error: "Missing paymentId or txid." });
    return;
  }

  try {
    const piRes = await fetch(`${PI_API_BASE}/payments/${paymentId}/complete`, {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ txid }),
    });

    const data = await piRes.json().catch(() => ({}));
    if (!piRes.ok) {
      res.status(piRes.status).json({ error: "Pi complete failed", detail: data });
      return;
    }

    res.status(200).json({ ok: true, payment: data });
  } catch (err) {
    res.status(502).json({ error: "Failed to reach Pi API", detail: String(err) });
  }
}
