// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Cash, rolled up and opened out
//  ----------------------------------------------------------------------------
//  One total, which is what a partner wants to read, over a table of the
//  accounts it is made of, which is what anybody acting on it needs.
//
//  The rule the component exists to enforce is that the two can never disagree.
//  The rows are not a separate account of the cash position assembled alongside
//  the headline — they are what the headline is the sum of, and the reconciling
//  line at the foot says so out loud rather than asking a reader to add up a
//  column to check.
//
//  Four things the single figure could not say, and each has a column:
//
//    · Restricted — a tax reserve, client money, a covenanted minimum. It is on
//      the statement and it does not fund the burn, so it is struck out of the
//      available column with the reason on the row.
//    · Held — what the bank statement actually says, in the currency the
//      account is denominated in. This never changes when the display currency
//      does, which is the point of showing it: switching the view restates the
//      position, it does not revalue it.
//    · Converted — the same money in whichever of the G10 (plus SGD) the reader
//      has chosen, at a rate that is named underneath.
//    · Reading — every row carries its own provenance and the total carries the
//      worst of them. A headline reading LIVE while a fifth of it was last seen
//      on a ledger is precisely the claim this product exists not to make.
// ════════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { C, S, label as labelStyle } from "../lib/theme.js";
import { TIERS } from "../lib/liveData.js";
import { viewIn } from "../lib/bankAccounts.js";
import { DISPLAY_CURRENCIES, fmtMoney, rates, fxStatus, RATES_PINNED_AT } from "../lib/fx.js";

/** The provenance marker used on each row and on the total. */
function Reading({ tier }) {
  const t = TIERS[tier] ?? TIERS.modelled;
  return (
    <span title={t.definition}
          style={{ display: "inline-flex", alignItems: "center", padding: "1px 6px", borderRadius: 3,
                   border: `1px solid ${t.colour}44`, background: `${t.colour}14`, color: t.colour,
                   fontSize: S.micro, fontWeight: 700, letterSpacing: "0.07em", whiteSpace: "nowrap" }}>
      {t.label}
    </span>
  );
}

const cell = { padding: "8px 10px 8px 0", verticalAlign: "top", fontSize: S.small,
               borderBottom: `1px solid ${C.border}`, fontVariantNumeric: "tabular-nums" };

/**
 * @param {object}   cash   an account book — fin.cash, or the Cash screen's own
 * @param {Function} money  fallback formatter, used before a currency is chosen
 * @param {boolean}  open   start expanded
 */
export default function AccountRollup({ cash, money, open = false }) {
  const [expanded, setExpanded] = useState(open);
  // null means "as the screen states it" — the book's own base. Choosing a
  // currency is a deliberate act, so nothing is restated until somebody asks.
  const [display, setDisplay] = useState(null);

  const base = cash?.base ?? cash?.ccy;
  const view = useMemo(() => (display ? viewIn(cash, display) : cash), [cash, display]);

  if (!cash?.accounts?.length) return null;

  const shown = display ?? base;
  const fmt = (v) => (display ? fmtMoney(v, display, { k: true }) : money(v));
  const { accounts, balance, available, restricted, banks, reading, currencies } = view;

  const sum = accounts.reduce((t, a) => t + a.balance, 0);
  const reconciles = Math.abs(sum - balance) < Math.max(0.01, Math.abs(balance) * 1e-9);

  const r = rates();
  const fx = fxStatus();

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, marginBottom: 12 }}>

      {/* ── The roll-up ── */}
      <button onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              title={expanded ? "Close the accounts" : "Open the accounts behind this figure"}
              style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between",
                       gap: 16, flexWrap: "wrap", padding: "13px 15px", background: "transparent",
                       border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
        <div style={{ minWidth: 0 }}>
          <div style={labelStyle()}>Cash on hand{display ? ` · restated into ${display}` : ""}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginTop: 5 }}>
            <span style={{ color: C.txt1, fontSize: 24, fontWeight: 300, letterSpacing: "-0.02em",
                           fontVariantNumeric: "tabular-nums" }}>{fmt(balance)}</span>
            {restricted > 0 && (
              <span style={{ color: C.gold, fontSize: S.body }}>{fmt(available)} available</span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: C.txt2, fontSize: S.small }}>
              {accounts.length} accounts
              {banks > 1 ? ` · ${banks} banks` : ""}
              {currencies > 1 ? ` · ${currencies} currencies` : ""}
            </div>
            <div style={{ marginTop: 4 }}><Reading tier={reading} /></div>
          </div>
          <span style={{ color: C.txt3, fontSize: 12, width: 12, textAlign: "center" }}>
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {/* ── The accounts ── */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "11px 15px 13px" }}>

          {/* Read it in ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <span style={labelStyle()}>Read in</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              <button onClick={() => setDisplay(null)} title={`As the company reports it — ${base}`}
                      style={chip(display === null)}>
                {base}
              </button>
              {DISPLAY_CURRENCIES.filter((c) => c !== base).map((c) => (
                <button key={c} onClick={() => setDisplay(c)} title={`Restate every account into ${c}`}
                        style={chip(display === c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr>
                  {[["Account", "left"], ["Bank", "left"], ["Held", "right"],
                    [`In ${shown}`, "right"], ["Available", "right"], ["Reading", "left"]].map(([h, align]) => (
                    <th key={h} style={{ ...labelStyle(), textAlign: align,
                                         padding: "9px 10px 7px 0", fontWeight: 600,
                                         borderBottom: `1px solid ${C.borderLt}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td style={{ ...cell, color: C.txt1 }}>
                      {a.label}
                      {a.why && (
                        <div style={{ color: C.txt3, fontSize: S.micro, marginTop: 3, lineHeight: 1.45,
                                      maxWidth: 250 }}>{a.why}</div>
                      )}
                    </td>
                    <td style={{ ...cell, color: C.txt2 }}>{a.bank}</td>
                    {/* What the statement says. Unmoved by the display currency. */}
                    <td style={{ ...cell, textAlign: "right",
                                 color: a.ccy === shown ? C.txt3 : C.txt2 }}>
                      {fmtMoney(a.native, a.ccy, { k: true })}
                    </td>
                    <td style={{ ...cell, color: C.txt1, textAlign: "right" }}>{fmt(a.balance)}</td>
                    <td style={{ ...cell, textAlign: "right",
                                 color: a.available === 0 ? C.txt3 : a.restricted > 0 ? C.gold : C.txt2 }}>
                      {a.available === 0 ? "—" : fmt(a.available)}
                    </td>
                    <td style={{ ...cell }}><Reading tier={a.feed} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ ...cell, borderBottom: "none", color: C.txt2, paddingTop: 11 }} colSpan={3}>
                    {reconciles
                      ? `Sums to the reported balance${display ? `, restated into ${display}` : ""}`
                      : "DOES NOT RECONCILE — the rows and the headline disagree"}
                  </td>
                  <td style={{ ...cell, borderBottom: "none", paddingTop: 11, textAlign: "right",
                               color: reconciles ? C.txt1 : C.red, fontWeight: 600 }}>{fmt(sum)}</td>
                  <td style={{ ...cell, borderBottom: "none", paddingTop: 11, textAlign: "right",
                               color: C.gold, fontWeight: 600 }}>{fmt(available)}</td>
                  <td style={{ ...cell, borderBottom: "none" }} />
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 11, paddingTop: 11,
                        color: C.txt3, fontSize: S.small, lineHeight: 1.65 }}>
            {restricted > 0 && (
              <div style={{ marginBottom: currencies > 1 || display ? 8 : 0 }}>
                <b style={{ color: C.txt2 }}>{fmt(restricted)} of the balance does not fund the burn.</b>{" "}
                Runway on the reported figure is <b style={{ color: C.txt2 }}>{view.runway} months</b>; on cash
                the company can actually spend it is <b style={{ color: C.gold }}>{view.availableRunway} months</b>.
                The reported figure is not wrong — it answers a narrower question than the board asked.
                {banks > 1 && ` Held across ${banks} banks, so the total reads from the ledger rather than a single feed.`}
              </div>
            )}

            {(currencies > 1 || display) && (
              <div>
                <b style={{ color: C.txt2 }}>Held in {currencies} currencies.</b>{" "}
                The <i>Held</i> column is what each bank statement says and does not move when the view does.
                {display && ` Restated into ${display} at ${(r[display] / r[base]).toFixed(4)} ${display}/${base}`}
                {display && ` — ${fx.status === "live" ? `live, ${fx.detail}` : `pinned ${RATES_PINNED_AT}`}.`}
                {!display && ` Rates are ${fx.status === "live" ? `live from ${fx.detail}` : `pinned at ${RATES_PINNED_AT}`}.`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** The currency chips. Small, quiet, and obviously a set of one-of-many. */
function chip(on) {
  return {
    padding: "3px 8px", borderRadius: 3, cursor: "pointer", fontFamily: "inherit",
    fontSize: S.micro, fontWeight: on ? 700 : 500, letterSpacing: "0.06em",
    border: `1px solid ${on ? C.gold : C.border}`,
    background: on ? C.gold : "transparent",
    color: on ? C.goldOn : C.txt2,
  };
}
