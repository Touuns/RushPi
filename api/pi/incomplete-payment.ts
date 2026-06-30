import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Helper for incomplete payments found at authentication time.
 *
 * The frontend calls this (with { paymentId }) when the SDK reports a pending
 * payment without a txid. We look it up via the Pi Platform API; if it now has a
 * transaction id we complete it, otherwise we report its status.
 *
 *   GET  https://api.minepi.com/v2/payments/{paymentId}
 *   POST https://api.minepi.com/v2/payments/{paymentId}/complete   body: { txid }
 *   Header: Authorization: Key <PI_API_KEY>
 */
const PI_API_BASE_URL = "https://api.minepi.com/v2";

async function readBody(r: Response): Promise<unknown> {
  const text = await r.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { paymentId } = (req.body ?? {}) as { paymentId?: string };
  if (!paymentId || typeof paymentId !== "string") {
    return res.status(400).json({ error: "Missing paymentId" });
  }

  const apiKey = process.env.PI_API_KEY;
  if (!apiKey) {
    console.error("[Pi incomplete] PI_API_KEY is not set");
    return res
      .status(500)
      .json({ error: "Missing PI_API_KEY server environment variable" });
  }

  const authHeaders = {
    Authorization: `Key ${apiKey}`,
    "Content-Type": "application/json",
  };

  try {
    const lookup = await fetch(
      `${PI_API_BASE_URL}/payments/${encodeURIComponent(paymentId)}`,
      { method: "GET", headers: authHeaders },
    );
    const payment = (await readBody(lookup)) as {
      transaction?: { txid?: string } | null;
    } | null;

    if (!lookup.ok) {
      console.error("[Pi incomplete] lookup error", lookup.status, payment);
      return res
        .status(lookup.status)
        .json({ error: "Pi payment lookup failed", status: lookup.status, details: payment });
    }

    const txid = payment?.transaction?.txid;
    if (!txid) {
      return res.status(200).json({ ok: false, status: "pending_no_txid", payment });
    }

    const complete = await fetch(
      `${PI_API_BASE_URL}/payments/${encodeURIComponent(paymentId)}/complete`,
      { method: "POST", headers: authHeaders, body: JSON.stringify({ txid }) },
    );
    const completed = await readBody(complete);

    if (!complete.ok) {
      console.error("[Pi incomplete] complete error", complete.status, completed);
      return res
        .status(complete.status)
        .json({ error: "Pi payment completion failed", status: complete.status, details: completed });
    }

    return res.status(200).json({ ok: true, payment: completed });
  } catch (error) {
    console.error("[Pi incomplete] server error:", error);
    return res
      .status(500)
      .json({ error: "Server error during incomplete payment handling" });
  }
}
