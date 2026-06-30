import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Helper for incomplete payments found at authentication time.
 *
 * The frontend calls this when the SDK reports a pending payment WITHOUT a txid
 * (so it can't be completed yet). We look the payment up via the Pi Platform API;
 * if it now has a transaction id we complete it, otherwise we return its status
 * so the user can be informed.
 *
 * Pi Platform API (official):
 *   GET  https://api.minepi.com/v2/payments/{id}
 *   POST https://api.minepi.com/v2/payments/{id}/complete   body: { txid }
 * Auth: "Authorization: Key <PI_API_KEY>".
 * VERIFY the exact response shape (where the txid lives) against the Pi docs.
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

  const authHeaders = {
    Authorization: `Key ${apiKey}`,
    "Content-Type": "application/json",
  };

  try {
    const lookup = await fetch(`${PI_API_BASE}/payments/${paymentId}`, {
      method: "GET",
      headers: authHeaders,
    });
    const payment = (await lookup.json().catch(() => ({}))) as {
      transaction?: { txid?: string } | null;
    };
    if (!lookup.ok) {
      res.status(lookup.status).json({ error: "Pi lookup failed", detail: payment });
      return;
    }

    const txid = payment?.transaction?.txid;
    if (!txid) {
      // Nothing we can do server-side yet; report back so the UI can inform the user.
      res.status(200).json({ ok: false, status: "pending_no_txid", payment });
      return;
    }

    const complete = await fetch(`${PI_API_BASE}/payments/${paymentId}/complete`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ txid }),
    });
    const completed = await complete.json().catch(() => ({}));
    if (!complete.ok) {
      res.status(complete.status).json({ error: "Pi complete failed", detail: completed });
      return;
    }

    res.status(200).json({ ok: true, payment: completed });
  } catch (err) {
    res.status(502).json({ error: "Failed to reach Pi API", detail: String(err) });
  }
}
