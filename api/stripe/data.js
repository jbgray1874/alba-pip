// /api/stripe/data.js — fetches real Stripe test-mode data.
// Pulls MRR, revenue, customer count, recent transactions.
// Falls back gracefully so the UI never breaks without a key.

const STRIPE = "https://api.stripe.com/v1";

async function sget(path, key) {
  const r = await fetch(`${STRIPE}${path}`, {
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!r.ok) throw new Error(`Stripe ${path} → ${r.status}`);
  return r.json();
}

export default async function handler(req, res) {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    res.status(200).json({ connected: false });
    return;
  }

  try {
    // Active subscriptions → MRR
    const subs = await sget("/subscriptions?limit=100&status=active&expand[]=data.plan", key);
    const subscriptions = subs.data || [];
    const mrr = subscriptions.reduce((sum, s) => {
      const amt = s.plan?.amount || s.items?.data?.[0]?.plan?.amount || 0;
      const interval = s.plan?.interval || s.items?.data?.[0]?.plan?.interval || "month";
      const monthly = interval === "year" ? amt / 12 : amt;
      return sum + monthly;
    }, 0);

    // Recent charges (last 30 days)
    const since = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 30;
    const charges = await sget(`/charges?limit=100&created[gte]=${since}`, key);
    const recentRevenue = (charges.data || [])
      .filter(c => c.paid && !c.refunded)
      .reduce((sum, c) => sum + c.amount, 0);

    // Customer count
    const customers = await sget("/customers?limit=1", key);
    const customerCount = customers.total_count || 0;

    // Recent transactions for activity stream
    const recent = (charges.data || []).slice(0, 5).map(c => ({
      id: c.id,
      amount: c.amount,
      currency: c.currency,
      description: c.description || c.billing_details?.name || "Subscription payment",
      created: c.created,
      status: c.status,
    }));

    res.status(200).json({
      connected: true,
      source: "Stripe · live",
      syncedAt: new Date().toISOString(),
      data: {
        mrr: Math.round(mrr / 100), // pence → pounds
        recentRevenue: Math.round(recentRevenue / 100),
        customerCount,
        subscriptionCount: subscriptions.length,
        recentTransactions: recent,
      },
    });
  } catch (e) {
    res.status(200).json({ connected: false, error: e.message });
  }
}
