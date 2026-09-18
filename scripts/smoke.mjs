// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Render every screen
//  ----------------------------------------------------------------------------
//  The check the suite did not have, and the reason a broken screen shipped.
//
//  verify.mjs reads the source as text. It can tell you that a view uses the
//  shared primitives, that its colours come from the tokens, that every button
//  is wired to something — and it cannot tell you that the view renders,
//  because that is not a property of the text. A helper called without being
//  imported compiles cleanly, bundles cleanly, and throws the moment somebody
//  opens the page. The screen goes blank. The error lands in a console nobody
//  has open. That is how it is found by a client rather than by a test.
//
//  So this renders all of them. Not a snapshot, and deliberately not an
//  assertion about what they look like — only that each one runs its own code
//  to completion and produces markup. That is a low bar and it is exactly the
//  bar that was being cleared by nothing at all.
//
//  renderToStaticMarkup runs the component body, which is where the failure
//  lives: every hook call, every helper, every read of the finance model. It
//  does not run effects, so anything a screen does after mounting is out of
//  scope here — that is what the browser pass at the foot of verify is for.
//
//  Run with: node --import ./scripts/register-jsx.mjs scripts/smoke.mjs
// ════════════════════════════════════════════════════════════════════════════

import { readdir } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// ── The browser, in the shape a render actually touches ─────────────────────
//  Not a DOM implementation — just enough that a component reading one of
//  these during render gets an answer rather than a ReferenceError. Anything
//  that needs more than this is doing browser work during render, which is
//  itself worth knowing about.

const store = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
  };
};

globalThis.localStorage ??= store();
globalThis.sessionStorage ??= store();
globalThis.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
globalThis.IntersectionObserver ??= class { observe() {} unobserve() {} disconnect() {} };
globalThis.requestAnimationFrame ??= (fn) => setTimeout(fn, 0);
globalThis.cancelAnimationFrame ??= (id) => clearTimeout(id);
// Nothing should fetch during render. If something does, it gets a promise
// that never settles rather than an exception, and the render proceeds.
globalThis.fetch ??= () => new Promise(() => {});

globalThis.window ??= globalThis;
globalThis.document ??= {
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, getContext: () => null }),
  querySelectorAll: () => [],
  addEventListener() {},
  removeEventListener() {},
  documentElement: { style: {} },
  body: { style: {} },
};
globalThis.window.addEventListener ??= () => {};
globalThis.window.removeEventListener ??= () => {};
globalThis.window.location ??= { search: "", pathname: "/", href: "http://localhost/" };
globalThis.navigator ??= { userAgent: "node" };

// ── What to render ──────────────────────────────────────────────────────────

/**
 * Props a screen needs to render at all.
 *
 * Only what is required — a screen that needs a prop it was never given should
 * fail here, because that is a real defect. `company` and `metric` are what the
 * drill-down is opened with from the company page.
 */
const PROPS = {
  "FinanceDrilldown.jsx": async () => {
    const { COMPANIES } = await import("../src/lib/companies.js");
    return { company: COMPANIES[0], metric: "cash", onClose() {} };
  },
  "ReportPanel.jsx": async () => {
    const { buildCash } = await import("../src/lib/scenarioCash.js");
    const { buildCashReport } = await import("../src/lib/reports.js");
    return { report: buildCashReport(buildCash()), onClose() {} };
  },
  "AccountRollup.jsx": async () => {
    const { COMPANIES } = await import("../src/lib/companies.js");
    const { buildFinance } = await import("../src/lib/financeData.js");
    const { fmtMoney } = await import("../src/lib/fx.js");
    const { cash } = buildFinance(COMPANIES[0]);
    return { cash, money: (v) => fmtMoney(v, cash.base, { k: true }), open: true };
  },
  "InsightCard.jsx": async () => {
    const { buildCash } = await import("../src/lib/scenarioCash.js");
    return { insight: buildCash().insight };
  },
  "LiveStrip.jsx": async () => {
    const { COMPANIES } = await import("../src/lib/companies.js");
    const { buildFinance } = await import("../src/lib/financeData.js");
    const { cash, revenue } = buildFinance(COMPANIES[0]);
    return {
      specs: [
        { key: "smoke-cash", label: "Cash balance", base: cash.balance, amplitude: 0.0025,
          integration: "bankfeed", fmt: (v) => Math.round(v).toLocaleString() },
        { key: "smoke-rev", label: "Monthly revenue", base: revenue.total, amplitude: 0.003,
          integration: "xero", fmt: (v) => Math.round(v).toLocaleString() },
      ],
      note: "Smoke test",
    };
  },
  "SignalTimeline.jsx": async () => {
    const { buildSignalDevelopment } = await import("../src/lib/signalDevelopment.js");
    const { buildRevenueMiss } = await import("../src/lib/scenarioRevenueMiss.js");
    const { fmtMoney } = await import("../src/lib/fx.js");
    const s = buildRevenueMiss();
    const signal = buildSignalDevelopment({ scenario: s });
    return {
      weeks: signal.weeks,
      alertWeek: signal.alertWeek,
      leadTimeWeeks: signal.leadTimeWeeks,
      reconciliation: signal.reconciliation,
      money: (v) => fmtMoney(v, s.currency, { k: true }),
    };
  },
};

const results = [];

async function render(dir, file) {
  const label = `${dir}/${file}`;
  try {
    const mod = await import(`../src/${dir}/${file}`);
    const Component = mod.default;
    if (typeof Component !== "function") {
      // A module of named exports rather than a screen. Importing it was still
      // worth doing — that alone catches a broken import chain.
      results.push({ label, ok: true, note: "no default export — import only" });
      return;
    }

    const props = PROPS[file] ? await PROPS[file]() : {};
    if (props === null) {
      results.push({ label, ok: true, note: "skipped — needs data this script cannot build" });
      return;
    }

    const html = renderToStaticMarkup(createElement(Component, props));
    if (!html || html.length < 20) {
      results.push({ label, ok: false, why: `rendered ${html.length} characters` });
      return;
    }
    results.push({ label, ok: true, note: `${html.length.toLocaleString()} chars` });
  } catch (e) {
    results.push({ label, ok: false, why: (e?.message ?? String(e)).split("\n")[0] });
  }
}

const views = (await readdir(new URL("../src/views/", import.meta.url))).filter((f) => f.endsWith(".jsx"));
const components = (await readdir(new URL("../src/components/", import.meta.url))).filter((f) => f.endsWith(".jsx"));

for (const f of views) await render("views", f);
for (const f of components) await render("components", f);
await render(".", "App.jsx");

// ── Result ──────────────────────────────────────────────────────────────────

const G = "\x1b[32m", R = "\x1b[31m", D = "\x1b[2m", X = "\x1b[0m";
console.log(`\n\x1b[1mEvery screen renders\x1b[0m`);
for (const r of results) {
  console.log(r.ok
    ? `  ${G}✓${X} ${r.label.padEnd(38)} ${D}${r.note ?? ""}${X}`
    : `  ${R}✗${X} ${r.label.padEnd(38)} ${R}${r.why}${X}`);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${"─".repeat(72)}`);
if (failed.length) {
  console.log(`${R}${failed.length} of ${results.length} screens do not render.${X}`);
  console.log(`${D}A screen that throws here is a blank pane in the browser.${X}\n`);
  process.exit(1);
}
console.log(`${G}${results.length} screens render.${X}\n`);
