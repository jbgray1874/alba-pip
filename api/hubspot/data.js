// /api/hubspot/data.js — fetches live HubSpot CRM data.
// Pulls deals pipeline, contacts, recent activity.
// Falls back gracefully without a key.

const HS = "https://api.hubapi.com";

async function hget(path, token) {
  const r = await fetch(`${HS}${path}`, {
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!r.ok) throw new Error(`HubSpot ${path} → ${r.status}`);
  return r.json();
}

export default async function handler(req, res) {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;

  if (!token) {
    res.status(200).json({ connected: false });
    return;
  }

  try {
    // Deals pipeline
    const dealsRes = await hget(
      "/crm/v3/objects/deals?limit=100&properties=dealname,amount,dealstage,closedate,hs_probability,pipeline",
      token
    );
    const deals = dealsRes.results || [];

    // Pipeline stages mapping
    const stageLabels = {
      "appointmentscheduled": "Qualified",
      "qualifiedtobuy": "Meeting Set",
      "presentationscheduled": "Demo",
      "decisionmakerboughtin": "Proposal",
      "contractsent": "Contract Sent",
      "closedwon": "Won",
      "closedlost": "Lost",
    };

    const pipelineDeals = deals
      .filter(d => d.properties.dealstage !== "closedlost")
      .map(d => ({
        id: d.id,
        name: d.properties.dealname || "Unnamed Deal",
        amount: parseFloat(d.properties.amount || 0),
        stage: stageLabels[d.properties.dealstage] || d.properties.dealstage || "Pipeline",
        probability: parseFloat(d.properties.hs_probability || 0),
        closeDate: d.properties.closedate,
      }))
      .sort((a, b) => b.amount - a.amount);

    const pipelineValue = pipelineDeals.reduce((s, d) => s + d.amount, 0);
    const weightedValue = pipelineDeals.reduce((s, d) => s + (d.amount * d.probability / 100), 0);
    const wonDeals = deals.filter(d => d.properties.dealstage === "closedwon");
    const wonValue = wonDeals.reduce((s, d) => s + parseFloat(d.properties.amount || 0), 0);

    // Contacts count
    const contactsRes = await hget("/crm/v3/objects/contacts?limit=1", token);
    const contactCount = contactsRes.total || 0;

    // Companies count
    const companiesRes = await hget("/crm/v3/objects/companies?limit=1", token);
    const companyCount = companiesRes.total || 0;

    // Stage breakdown for funnel
    const stageCounts = {};
    pipelineDeals.forEach(d => {
      stageCounts[d.stage] = (stageCounts[d.stage] || 0) + 1;
    });

    res.status(200).json({
      connected: true,
      source: "HubSpot · live",
      syncedAt: new Date().toISOString(),
      data: {
        pipelineValue: Math.round(pipelineValue),
        weightedValue: Math.round(weightedValue),
        wonValue: Math.round(wonValue),
        dealCount: pipelineDeals.length,
        contactCount,
        companyCount,
        topDeals: pipelineDeals.slice(0, 6),
        stageCounts,
      },
    });
  } catch (e) {
    res.status(200).json({ connected: false, error: e.message });
  }
}
