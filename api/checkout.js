const prices = {
  software: "price_1UONBrIxCmDSYfBKgohkcM07",
  satya: "price_1UONBsIxCmDSYfBK7KkqfEG2"
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    res.status(500).json({ error: "Stripe test key is not set on Vercel" });
    return;
  }
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const items = Array.isArray(body.items) ? body.items : [];
  const lines = items.filter((item) => prices[item.id]);
  if (!lines.length) {
    res.status(400).json({ error: "Nothing in the basket can be paid yet" });
    return;
  }
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", "https://bengstock-site.vercel.app/basket.html?paid=1");
  params.set("cancel_url", "https://bengstock-site.vercel.app/basket.html");
  params.set("billing_address_collection", "required");
  params.set("phone_number_collection[enabled]", "true");
  params.set("shipping_address_collection[allowed_countries][0]", "GB");
  lines.forEach((item, i) => {
    params.set(`line_items[${i}][price]`, prices[item.id]);
    params.set(`line_items[${i}][quantity]`, String(Math.max(1, Number(item.qty) || 1)));
  });
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });
  const data = await response.json();
  if (!response.ok) {
    res.status(response.status).json({ error: data.error && data.error.message ? data.error.message : "Stripe refused the checkout" });
    return;
  }
  res.status(200).json({ url: data.url });
}
