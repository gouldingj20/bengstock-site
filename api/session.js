// Confirms a Stripe Checkout session was paid. Returns only { paid: true|false }.
export default async function handler(req, res) {
  const id = String((req.query && req.query.id) || "");
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !/^cs_[A-Za-z0-9_]+$/.test(id)) {
    res.status(400).json({ paid: false });
    return;
  }
  try {
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}` }
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("session: Stripe error", response.status, data && data.error ? data.error.message : "");
      res.status(200).json({ paid: false });
      return;
    }
    res.status(200).json({ paid: data.payment_status === "paid" });
  } catch (e) {
    console.error("session: request failed", e);
    res.status(200).json({ paid: false });
  }
}
