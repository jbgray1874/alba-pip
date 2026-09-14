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
//  Three things the single figure could not say, and each has a column:
//
//    · Restricted — a tax reserve, client money, a covenanted minimum. It is on
//      the statement and it does not fund the burn, so it is struck through in
//      the available column with the reason on the row.
//    · Currency — cash in an overseas subsidiary is reachable in principle and
//      not this quarter, which is a different thing from cash in the operating
//      account.
//    · Reading — every row carries its own provenance, and the total carries
//      the worst of them. A headline that reads LIVE while a fifth of it was
//      last seen on a ledger is precisely the claim this product exists not to
//      make.
// ════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { C, S, label as labelStyle } from "../lib/theme.js";
import { TIERS } from "../lib/liveData.js";

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
 * @param {object}   cash   fin.cash — carries accounts, balance, restricted, available
 * @param {Function} money  the currency formatter the calling screen is using
 * @param {boolean}  open   start expanded
 */
export default function AccountRollup({ cash, money, open = false }) {
  const [expanded, setExpanded] = useState(open);
  const { accounts = [], balance, available, restricted, banks, reading } = cash;

  if (!accounts.length) return null;

  const sum = accounts.reduce((t, a) => t + a.balance, 0);
  const reconciles = Math.abs(sum - balance) < 0.005;

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
          <div style={labelStyle()}>Cash on hand</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginTop: 5 }}>
            <span style={{ color: C.txt1, fontSize: 24, fontWeight: 300, letterSpacing: "-0.02em",
                           fontVariantNumeric: "tabular-nums" }}>{money(balance)}</span>
            {restricted > 0 && (
              <span style={{ color: C.gold, fontSize: S.body }}>
                {money(available)} available
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: C.txt2, fontSize: S.small }}>
              {accounts.length} accounts{banks > 1 ? ` · ${banks} banks` : ""}
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
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "4px 15px 13px" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
              <thead>
                <tr>
                  {["Account", "Bank", "Ccy", "Balance", "Available", "Reading"].map((h, i) => (
                    <th key={h} style={{ ...labelStyle(), textAlign: i >= 3 && i <= 4 ? "right" : "left",
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
                                      maxWidth: 260 }}>{a.why}</div>
                      )}
                    </td>
                    <td style={{ ...cell, color: C.txt2 }}>{a.bank}</td>
                    <td style={{ ...cell, color: a.ccy === cash.ccy ? C.txt2 : C.gold }}>{a.ccy}</td>
                    <td style={{ ...cell, color: C.txt1, textAlign: "right" }}>{money(a.balance)}</td>
                    <td style={{ ...cell, textAlign: "right",
                                 color: a.available === 0 ? C.txt3 : a.restricted > 0 ? C.gold : C.txt2 }}>
                      {a.available === 0 ? "—" : money(a.available)}
                    </td>
                    <td style={{ ...cell }}><Reading tier={a.feed} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ ...cell, borderBottom: "none", color: C.txt2, paddingTop: 11 }} colSpan={3}>
                    {reconciles
                      ? "Sums to the reported balance"
                      : "DOES NOT RECONCILE — the rows and the headline disagree"}
                  </td>
                  <td style={{ ...cell, borderBottom: "none", paddingTop: 11, textAlign: "right",
                               color: reconciles ? C.txt1 : C.red, fontWeight: 600 }}>{money(sum)}</td>
                  <td style={{ ...cell, borderBottom: "none", paddingTop: 11, textAlign: "right",
                               color: C.gold, fontWeight: 600 }}>{money(available)}</td>
                  <td style={{ ...cell, borderBottom: "none" }} />
                </tr>
              </tfoot>
            </table>
          </div>

          {restricted > 0 && (
            <div style={{ color: C.txt3, fontSize: S.small, lineHeight: 1.65, marginTop: 11,
                          borderTop: `1px solid ${C.border}`, paddingTop: 11 }}>
              <b style={{ color: C.txt2 }}>{money(restricted)} of the balance does not fund the burn.</b>{" "}
              Runway on the reported figure is <b style={{ color: C.txt2 }}>{cash.runway} months</b>; on cash the
              company can actually spend it is <b style={{ color: C.gold }}>{cash.availableRunway} months</b>. The
              reported figure is not wrong — it answers a narrower question than the board asked.
              {banks > 1 && ` Held across ${banks} banks, so the total reads from the ledger rather than a single feed.`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
