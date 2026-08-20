// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — KPI definitions and source systems
//  ----------------------------------------------------------------------------
//  The demo specification asks for "KPI definitions and source-system labels"
//  as part of the data foundation, and requires that a user can open any figure
//  and see its calculation methodology and where it came from.
//
//  Source labels previously lived as hardcoded strings inside the drill-down —
//  "Xero · synced 4h ago" sat above figures that had never been near Xero. A
//  label that cannot be wrong is worse than no label, because it is believed.
//  Here the label travels with the number.
// ════════════════════════════════════════════════════════════════════════════

/** Systems a figure can come from, with how it is currently supplied. */
export const SOURCES = {
  accounting: { id: "accounting", label: "Xero", kind: "Accounting", live: true,
                note: "Live for the connected company; representative for the rest until connected" },
  banking:    { id: "banking", label: "Xero bank feed", kind: "Banking", live: true,
                note: "Cash position and movements" },
  billing:    { id: "billing", label: "Stripe", kind: "Billing", live: true,
                note: "Subscriptions, MRR and collections" },
  crm:        { id: "crm", label: "HubSpot", kind: "CRM", live: true,
                note: "Opportunities, stages and close dates" },
  hris:       { id: "hris", label: "BambooHR", kind: "HRIS", live: false,
                note: "Headcount and attrition — connector planned" },
  alba:       { id: "alba", label: "Alba calculation", kind: "Derived", live: true,
                note: "Computed from the figures above; see methodology" },
};

/**
 * Every KPI the platform shows, with the definition a buyer will ask for.
 * `formula` is written to be read aloud in a portfolio review.
 */
export const KPIS = {
  revenue: {
    label: "Revenue", unit: "currency", period: "month",
    definition: "Recognised revenue for the month, before cost of sales.",
    formula: "Sum of recognised revenue in the accounting ledger",
    source: SOURCES.accounting,
  },
  budget: {
    label: "Revenue plan", unit: "currency", period: "month",
    definition: "The monthly revenue plan agreed at the start of the financial year.",
    formula: "Board-approved plan, fixed at year start and not restated",
    source: SOURCES.accounting,
  },
  revenueVariance: {
    label: "Revenue vs plan", unit: "percent", period: "month",
    definition: "Revenue as a percentage of plan. Below 100% is behind plan.",
    formula: "revenue ÷ plan × 100",
    source: SOURCES.alba,
  },
  grossMargin: {
    label: "Gross margin", unit: "percent", period: "month",
    definition: "Gross profit as a share of revenue.",
    formula: "(revenue − cost of sales) ÷ revenue × 100",
    source: SOURCES.accounting,
  },
  ebitdaMargin: {
    label: "EBITDA margin", unit: "percent", period: "month",
    definition: "Earnings before interest, tax, depreciation and amortisation, as a share of revenue.",
    formula: "(gross profit − operating cost) ÷ revenue × 100",
    source: SOURCES.accounting,
  },
  cash: {
    label: "Cash", unit: "currency", period: "point in time",
    definition: "Closing bank balance at the end of the month.",
    formula: "Sum of bank account balances",
    source: SOURCES.banking,
  },
  burn: {
    label: "Net burn", unit: "currency", period: "month",
    definition: "Net cash consumed in the month. Negative burn means cash generated.",
    formula: "opening cash − closing cash",
    source: SOURCES.banking,
  },
  runway: {
    label: "Cash runway", unit: "months", period: "point in time",
    definition: "Months of cash remaining at the current rate of burn, before any management action.",
    formula: "closing cash ÷ current monthly net burn",
    source: SOURCES.alba,
  },
  overdueAR: {
    label: "Overdue receivables", unit: "currency", period: "point in time",
    definition: "Invoiced amounts past their due date and still unpaid.",
    formula: "Sum of open invoices where due date is in the past",
    source: SOURCES.accounting,
  },
  headcount: {
    label: "Headcount", unit: "count", period: "point in time",
    definition: "Permanent employees in post at month end.",
    formula: "Active employee records",
    source: SOURCES.hris,
  },
  attrition: {
    label: "Attrition", unit: "percent", period: "annualised",
    definition: "Annualised rate at which employees leave, voluntary and involuntary.",
    formula: "leavers in the last 12 months ÷ average headcount × 100",
    source: SOURCES.hris,
  },
  pipelineCoverage: {
    label: "Pipeline coverage", unit: "multiple", period: "quarter",
    definition: "Open pipeline relative to the bookings target for the quarter. Below 3x is generally considered thin.",
    formula: "open in-quarter pipeline ÷ quarterly bookings quota",
    source: SOURCES.crm,
  },
  winRate: {
    label: "Win rate", unit: "percent", period: "trailing two quarters",
    definition: "Share of closed opportunities that were won.",
    formula: "opportunities won ÷ (won + lost) × 100",
    source: SOURCES.crm,
  },
  healthScore: {
    label: "Health score", unit: "score", period: "point in time",
    definition: "Composite 0-100 score across finance, sales, people, operations, procurement, technology and compliance.",
    formula: "Weighted mean of the seven sub-scores",
    source: SOURCES.alba,
  },
};

/** Look up a definition for a methodology panel. Returns null rather than guessing. */
export function kpi(key) {
  return KPIS[key] || null;
}

/** One-line provenance string: what it is, how it is worked out, where it came from. */
export function provenanceOf(key, asOf) {
  const k = KPIS[key];
  if (!k) return null;
  return `${k.formula} · ${k.source.label}${asOf ? ` · as of ${asOf}` : ""}`;
}

/**
 * The one company with a live accounting connection.
 *
 * Held here as an id rather than a name, because the name is the registry's to
 * decide — RealTime.jsx and FinanceDrilldown.jsx both used to spell it out, and
 * both still said "Meridian SaaS" for four commits after the company was
 * renamed. Anything that needs to display it looks the name up.
 */
export const CONNECTED_COMPANY_ID = "meridian";
