const prices = {
  "bengstock-basic": { amount: 25000, name: "BengStock Desktop Basic · 1 year · 1 computer (Linux, offline licence, renewed yearly)", digital: true },
  "bengstock-pro": { amount: 50000, name: "BengStock Desktop Pro · 1 year · 4 computers (Linux, offline licence, renewed yearly)", digital: true },
  "bengstock-extra": { amount: 10000, name: "BengStock Desktop extra computer (add-on to Basic or Pro)", digital: true },
  satya: { price: "price_1UONXVIxCmDSYfBKPKoPCP5B", amount: 199, weight: 0.2 }
};

const ALLOWED_HOSTS = ["bengstock-site.vercel.app", "j-ben-g.app", "www.j-ben-g.app"];
const MAX_QTY = 50;

// Quantity as a whole number from 1 to 50.
function cleanQty(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, MAX_QTY);
}

// Return URLs never come from request headers: SITE_URL env, else the first allowed host.
function siteOrigin() {
  const env = (process.env.SITE_URL || "").trim().replace(/\/+$/, "");
  if (env) {
    try {
      const u = new URL(env);
      if (u.protocol === "https:" && ALLOWED_HOSTS.includes(u.hostname)) return u.origin;
    } catch (e) { /* fall through */ }
  }
  return `https://${ALLOWED_HOSTS[0]}`;
}

function deliveryPence(items) {
  let goods = 0;
  let weight = 0;
  items.forEach((item) => {
    const product = prices[item.id];
    if (!product || !product.weight) return;
    const qty = cleanQty(item.qty);
    goods += product.amount * qty;
    weight += product.weight * qty;
  });
  if (!weight) return 0;
  const boxes = Math.max(1, Math.ceil(weight / 20));
  const chargeable = goods >= 2500 ? boxes - 1 : boxes;
  return chargeable * 999;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error("checkout: STRIPE_SECRET_KEY is not set");
    res.status(500).json({ error: "Payment is not available right now. Please try again later." });
    return;
  }
  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  } catch (e) {
    res.status(400).json({ error: "Your basket could not be read. Please try again." });
    return;
  }
  const items = Array.isArray(body.items) ? body.items : [];
  const lines = items
    .filter((item) => item && typeof item.id === "string" && Object.prototype.hasOwnProperty.call(prices, item.id))
    .map((item) => ({ id: item.id, qty: cleanQty(item.qty) }));
  if (!lines.length) {
    res.status(400).json({ error: "Nothing in the basket can be paid yet" });
    return;
  }
  const hasPlan = lines.some((item) => item.id === "bengstock-basic" || item.id === "bengstock-pro");
  if (lines.some((item) => item.id === "bengstock-extra") && !hasPlan) {
    res.status(400).json({ error: "Extra computers need a Basic or Pro plan in the basket." });
    return;
  }
  const params = new URLSearchParams();
  params.set("mode", "payment");
  const origin = siteOrigin();
  params.set("success_url", `${origin}/basket.html?session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${origin}/basket.html`);
  params.set("billing_address_collection", "required");
  params.set("phone_number_collection[enabled]", "true");
  params.set("customer_creation", "always");
  // Only ask for a delivery address when the order has physical goods.
  if (lines.some((item) => !prices[item.id].digital)) {
    params.set("shipping_address_collection[allowed_countries][0]", "GB");
  }
  lines.forEach((item, i) => {
    let qty = item.qty;
    const product = prices[item.id];
    if (item.id === "satya") {
      qty = Math.floor(qty / 12) * 6 + (qty % 12);
      params.set(`line_items[${i}][price]`, product.price);
      params.set(`line_items[${i}][quantity]`, String(qty));
      return;
    }
    params.set(`line_items[${i}][quantity]`, String(qty));
    params.set(`line_items[${i}][price_data][currency]`, "gbp");
    params.set(`line_items[${i}][price_data][unit_amount]`, String(product.amount));
    params.set(`line_items[${i}][price_data][product_data][name]`, product.name);
  });
  const delivery = deliveryPence(lines.map((item) => {
    const qty = item.qty;
    return item.id === "satya" ? { ...item, qty: Math.floor(qty / 12) * 6 + (qty % 12) } : item;
  }));
  if (delivery) {
    const i = lines.length;
    params.set(`line_items[${i}][quantity]`, "1");
    params.set(`line_items[${i}][price_data][currency]`, "gbp");
    params.set(`line_items[${i}][price_data][unit_amount]`, String(delivery));
    params.set(`line_items[${i}][price_data][product_data][name]`, "Delivery");
  }
  try {
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });
    const data = await response.json();
    if (!response.ok || !data.url) {
      console.error("checkout: Stripe error", response.status, data && data.error ? data.error.message : data);
      res.status(502).json({ error: "Payment could not open. Please try again." });
      return;
    }
    res.status(200).json({ url: data.url });
  } catch (e) {
    console.error("checkout: request failed", e);
    res.status(502).json({ error: "Payment could not open. Please try again." });
  }
}
