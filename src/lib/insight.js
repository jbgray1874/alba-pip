// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Standard Insight
//  ----------------------------------------------------------------------------
//  The demo specification's shared component 3: every risk and opportunity uses
//  the same structure, so a user learns the shape once and can then interrogate
//  anything.
//
//    What happened · Why it matters · Evidence · Expected financial impact
//    Recommended action · Confidence · Source data and last refresh
//
//  makeInsight refuses to build a card without evidence, and refuses evidence
//  without a source and a refresh date. The constraint is enforced where the
//  card is constructed rather than checked in review, because an insight that
//  cannot be traced is the one thing the specification says must never appear.
// ════════════════════════════════════════════════════════════════════════════

export const CONFIDENCE = {
  HIGH: { label: "High", note: "Multiple independent indicators agree and source data is current." },
  MEDIUM: { label: "Medium", note: "Indicators agree but one input is estimated or lagging." },
  LOW: { label: "Low", note: "Directionally supported; treat as a prompt to investigate." },
};

const REQUIRED = [
  "id", "type", "companyId", "companyName", "headline",
  "whatHappened", "whyItMatters", "evidence", "impact", "confidence", "methodology",
  // Every report prints this and every card shows it. Omitted, it renders as
  // "raised undefined" on screen and in a circulated PDF rather than failing
  // anywhere a build would catch — which is exactly what happened on the three
  // scenarios added after this list was first written.
  "raisedOn",
];

export function makeInsight(spec) {
  for (const key of REQUIRED) {
    if (spec[key] == null) throw new Error(`Insight ${spec.id ?? "(unnamed)"} is missing "${key}"`);
  }
  if (!Array.isArray(spec.evidence) || spec.evidence.length === 0) {
    throw new Error(`Insight ${spec.id} must carry at least one evidence row`);
  }
  for (const row of spec.evidence) {
    if (!row.source || !row.asOf) {
      throw new Error(`Insight ${spec.id}: evidence "${row.label}" has no source or refresh date`);
    }
  }
  return {
    actions: [],
    drillDown: null,
    ...spec,
  };
}

/** Evidence row helper — keeps the source and refresh date mandatory at the call site. */
export function evidence(label, value, source, asOf, detail = null) {
  return { label, value, source: source?.label ?? source, asOf, detail };
}
