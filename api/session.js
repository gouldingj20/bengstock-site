// Confirms a Stripe Checkout session really was paid before the basket shows a success message.
export default async function handler(req, res) {
  const id = String((req.query && req.query.id) || "");
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !/^cs_[A-Za-z0-9_]+$/.test(id)) {
    res.status(400).json({ paid: false });
    return;
  }
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${id}`, {
    headers: { Authorization: `Bearer ${key}` }
  });
  const data = await response.json();
  if (!response.ok) {
    res.status(404).json({ paid: false });
    return;
  }
  res.status(200).json({
    paid: data.payment_status === "paid",
    email: data.customer_details && data.customer_details.email ? data.customer_details.email : null
  });
}
