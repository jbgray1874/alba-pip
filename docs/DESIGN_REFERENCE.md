# Alba PIP — Design reference

Transcribed from the nine reference screens. This is the source of truth for
layout. `src/lib/theme.js` is the source of truth for colour and type;
`src/components/Shell.jsx` holds the primitives. Never introduce a raw hex.

## Chrome (already built in App.jsx — do not re-implement)

Top bar 48px: mark + ALBA PIP · four sections PORTFOLIO / INTELLIGENCE /
ACTIONS / REPORTS with a 2px gold underline on the active one · fund name and
a circular gold-ringed avatar right. A 52px icon rail below-left. A named
section bar under the top bar.

## The skeleton every screen shares

1. Breadcrumb — `Portfolio / NovaTech Solutions / Revenue Performance`, 11px muted
2. H1 25px weight 400, with status chips inline to its right
3. Purpose — one sentence, 12.5px, secondary
4. Meta — `Updated 2 min ago · HubSpot + Xero + Stripe`, 11px muted
5. Actions top-right — primary gold solid, secondary gold outline
6. A row of four metric cards: uppercase 9.5px label, 30px weight-300 numeral, 11px sub
7. Body: two columns, evidence left (~1.35fr) and intelligence right (1fr)
8. A provenance strip at the foot, items separated by a gold `·`

Chips are 8.5px, uppercase, letterspaced 0.1em, 1px border at 55% alpha over a
18% tint. ATTENTION/HIGH PRIORITY/ACTION REQUIRED red or gold; READY TO
CIRCULATE / READY FOR APPROVAL / QUALIFIED green.

Numbered markers are small circles with a gold border and a gold numeral.
Owner avatars are 20px circles with initials, a coloured ring, name beside.

---

## Screen 1 — Portfolio Command Centre  (PORTFOLIO)

H1 `Portfolio Command Centre`; purpose `Live operating intelligence across N
portfolio companies`; meta `Updated 2 min ago · N sources connected`.
Metric cards sit on the **same row as the H1**, right-aligned: PORTFOLIO
COMPANIES / HEALTHY (green) / ATTENTION (gold) / CRITICAL (red).

Row 2, three panels:
- **PORTFOLIO HEALTH** — donut ring, score in the centre over `/100`, legend at
  right with a coloured dot per band and its count.
- **CASH RUNWAY** — single large numeral, the word `MONTHS` beneath it.
- **REVENUE GROWTH** — `+14.8%` green, area sparkline beneath, green fill.

Row 3, two panels:
- **PORTFOLIO PRIORITY MAP** — table RANK | COMPANY | STATUS | PRIMARY ISSUE.
  Company shown as a small rounded square with its initial, then the name.
  Status is a coloured dot plus the word.
- **PRIORITY INTELLIGENCE** — three cards. Each has a category label in colour
  (REVENUE RISK gold, LIQUIDITY red, VALUE CREATION green), a warning or trend
  glyph left, the company in bold, one line of detail, and at the right a
  confidence chip over a small source line (`CRM + Finance`).

## Screen 2 — Opportunity Radar  (INTELLIGENCE)

Breadcrumb `Intelligence / Opportunity Radar`. Metrics: QUALIFIED UPSIDE (green)
/ HIGH-CONFIDENCE OPPORTUNITIES / COMPANIES WITH SIGNALS / MEDIAN CONFIDENCE.

- **VALUE-CREATION MAP** (left) — scatter. Y `ESTIMATED VALUE`, X `CONFIDENCE`
  40%–100%. One bubble per company, radius by value, the leader gold and the
  rest green, each labelled with company and value beside the bubble.
- **TOP OPPORTUNITY** (right) — company name plus a type chip, the range in
  green at 22px, confidence beneath in green, a paragraph, then a four-row
  key/value list, then OPEN OPPORTUNITY (gold) and VIEW SCORING (outline).
- **RANKED OPPORTUNITIES** full width — # | COMPANY | OPPORTUNITY | ESTIMATED
  VALUE | CONFIDENCE | STATUS chip.
- Provenance: `Opportunity scores use transparent rules · CRM + Product +
  Billing data · Last refresh 09:40`.

## Screen 3 — Customer Expansion  (INTELLIGENCE)

Breadcrumb `Intelligence / Opportunity Radar / <Company>`. Two meta lines: the
company, sector and opportunity confidence in green; then updated + sources.
Metrics: ELIGIBLE ACCOUNTS / ESTIMATED UPSIDE (green) / AVG OPPORTUNITY SCORE /
RENEWAL WITHIN 120 DAYS.

- **PRIORITISED ACCOUNTS** (left) — numbered rows: ACCOUNT | USAGE TREND (green
  sparkline) | PRODUCTS | RENEWAL | HEALTH chip | SCORE | EST. ARR.
- **SELECTED ACCOUNT** (right) — name, ARR green, score chip `92 / 100`, then
  **WHY THIS ACCOUNT**: factor | observed value | `+25 pts` in green, one row
  per factor. Then **COMPARABLE PATTERN**, one sentence. Buttons ADD TO
  CAMPAIGN (gold) / VIEW ACCOUNT (outline).
- **SCORING MODEL** strip listing the rules, then the provenance bar.

## Screen 4 — Commercial Action Plan  (ACTIONS)  ** NEW **

Breadcrumb `Actions / <Company> / <Opportunity>`. Chip READY FOR APPROVAL.
Actions APPROVE CAMPAIGN (gold) / GENERATE BRIEF (outline).
Metrics: TARGET ACCOUNTS / QUALIFIED UPSIDE (green) / EXPECTED CONVERSION
(green) / FIRST ACTIONS DUE (green).

- **PRIORITISED CAMPAIGN** (left) — numbered gold circles | ACCOUNT | OWNER
  (avatar + name) | CROSS-SELL PROPOSITION | ACTION DATE | STAGE chip
  (EXECUTIVE OUTREACH green, ACCOUNT PLAN blue, DISCOVERY purple) | EST. ARR.
- **CAMPAIGN PLAYBOOK** (right) — steps `01`–`04` in gold circles, title and one
  line each. Below it **ACCOUNTABILITY**: executive sponsor, campaign owner,
  investment owner, review cadence. Below that an advisory line with an `i`
  glyph.
- **Milestone timeline** full width — four nodes on a dashed rule: APPROVAL
  (green tick), FIRST OUTREACH, DISCOVERY COMPLETE, PIPELINE REVIEW, each with
  a date beneath.
- Provenance: `Expected ARR uses account-level estimates · Assumptions visible ·
  Progress tracked in Alba`.

## Screen 5 — Revenue Risk Investigation  (INTELLIGENCE)

Chips HIGH PRIORITY (red) and `92% CONFIDENCE` (gold). Actions CREATE ACTION
PLAN (gold) / VIEW RAW EVIDENCE (outline).
Metrics: PLAN / CURRENT FORECAST / FORECAST GAP (red, signed) / LEAD TIME.

- **REVENUE BRIDGE** (left) — waterfall. Gold columns at both ends, red floating
  bars between, dashed connectors between bar tops, value labels above each
  bar, category labels beneath.
- **ROOT CAUSE EVIDENCE** (right) — one row per driver: a circular glyph (↓ ↑ −)
  coloured by direction, the driver in bold, a one-line detail, and at the right
  `Impact −$0.45M` in red above an outlined source chip (HUBSPOT / STRIPE …).
- **SIGNAL DEVELOPMENT** full width — a horizontal timeline, `EARLY INDICATOR`
  green at the left and `BOARD MEETING` gold at the right. One node per week
  from Week −7 to Week 0, each with a short caption beneath. The alert week is
  marked `ALBA ALERT` in red above the node, and a red dashed line spans from it
  to the board meeting labelled `N WEEKS EARLY`.
- Provenance: `Calculation: transparent driver bridge · Evidence: 6 metrics ·
  Sources: 4 systems · Human review: pending`.

## Screen 6 & 9 — Report Preview  (REPORTS)

H1 `Report Preview`, chip READY TO CIRCULATE, actions DOWNLOAD PDF (gold) /
SHARE (outline) / EDIT (ghost). Three columns:

- **REPORT CONTENT** (left, narrow) — a checklist, each item a green tick circle
  and its section name.
- **The paper** (centre) — a cream sheet (#F5F2EA) with a second page peeking
  behind it and a page number. Set entirely in the serif. Contents: small-caps
  `ALBA PIP · PORTFOLIO INTELLIGENCE` header, serif H1, a subtitle line
  `Company | Subject | Date`, a status line in colour, a hairline rule, then
  `EXECUTIVE SUMMARY` as a small-caps label over serif body, a band of four
  figures divided by hairlines, further sections, and an italic footer naming
  the accountable people and the sources.
- **REPORT SETTINGS** (right, narrow) — Audience / Period / Format / Detail /
  Pages, each with a small glyph, then `Generated in N seconds`.

## Screen 7 — Company Revenue Performance  (PORTFOLIO)

H1 is the **company name** with an ATTENTION chip; purpose `Revenue Performance
· B2B Software`. Metrics right-aligned on the H1 row: Q3 REVENUE / Q4 FORECAST
/ PIPELINE COVERAGE / WIN RATE, each with a red sub-line showing the movement.

- **ACTUAL + FORECAST VS PLAN** (left) — line chart with a legend of three
  series: Actual (solid white), Forecast (solid gold), Plan (dotted grey).
- **ALBA EARLY WARNING** (right) — label `LIKELY Q4 MISS`, the amount at 34px in
  red, a confidence chip, a paragraph, then four rows each with a coloured dot,
  the metric name, and `3.2x → 1.9x` at the right. Buttons INVESTIGATE SIGNAL
  (gold) / VIEW SOURCE DATA (ghost) and a small evidence line.
- Three cards along the bottom: SALES CYCLE / CHURN / DEAL SLIP RATE.

## Screen 8 — Revenue Protection Plan  (ACTIONS)  ** NEW **

Chip ACTION REQUIRED (red). Actions APPROVE PLAN (gold) / GENERATE REPORT
(outline). Metrics: FORECAST RISK (red) / RECOVERY TARGET (green) / RESIDUAL GAP
(red) / NEXT REVIEW.

- **RECOMMENDED ACTIONS** full width — PRIORITY (numbered gold circle) | ACTION |
  OWNER (avatar + name) | DUE | EXPECTED IMPACT (green) | STATUS chip.
- **RECOVERY PATH** (left) — an equation of boxes joined by small circular
  operators: CURRENT FORECAST `+` TARGETED RECOVERY (green) `=` REVISED CASE
  `−` RESIDUAL GAP (red). A dashed bracket beneath.
- **ALBA RECOMMENDATION** (right) — a paragraph, then accountable executive,
  investment owner, review cadence and next review as small labelled fields.
- Provenance: `Based on 6 metrics · 4 source systems · Impact estimates are
  transparent`.

---

## Data

The reference screens use placeholder companies. **Keep this build's portfolio.**
Every figure must come from the existing lib modules — `financeData`,
`companies`, `scenario*`, `companyModules`, `actionTracker`, `investigation`.
Never type a number into a view.
