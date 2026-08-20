// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Live strip
//  ----------------------------------------------------------------------------
//  A row of continuously moving readings, placed at the top of the screens a
//  partner spends time on. Two rules govern it, and they are the whole point:
//
//    Nothing is ever empty, and nothing ever stops. A tile whose provider has
//    gone carries on from its last reading rather than blanking or freezing.
//
//    The badge follows the truth. When a credential lapses, the tile keeps
//    moving and the label drops from LIVE to SIMULATED with the reason on hover.
//
//  The mean of every reading is the underlying figure, so the number ticking
//  here and the number in the drill-down are the same number.
// ════════════════════════════════════════════════════════════════════════════

import { C } from "../lib/theme.js";
import { useMemo } from "react";
import { useLiveFeeds, integrationHealth } from "../lib/liveFeed.js";
import { TIERS } from "../lib/liveData.js";

// Palette from the shared design tokens. Every view used to carry its own
// copy of this object, seventeen of them, each a shade adrift of the next.
const T = {
  card: C.surface,
  border: C.border,
  bg: C.bg,
  txt1: C.txt1,
  txt3: C.txt3
};

function Tile({ feed }) {
  const tier = TIERS[feed.tier] ?? TIERS.simulated;
  const shown = feed.fmt ? feed.fmt(feed.value) : Math.round(feed.value).toLocaleString();
  return (
    <div title={`${tier.label} — ${tier.definition}\n${feed.detail}`}
         style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 7,
                  padding: "8px 11px", flex: 1, minWidth: 132 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ color: T.txt3, fontSize: 8.5, letterSpacing: "0.08em", textTransform: "uppercase",
                       whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{feed.label}</span>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: tier.colour, flexShrink: 0,
                       animation: "stripPulse 1.8s ease-in-out infinite" }} />
      </div>
      <div style={{ color: T.txt1, fontSize: 15, fontWeight: 700, fontFamily: "monospace",
                    fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{shown}</div>
      <div style={{ color: tier.colour, fontSize: 8, letterSpacing: "0.06em", marginTop: 3 }}>
        {feed.provider && feed.tier !== "modelled" ? feed.provider : tier.label}
        {feed.provider && feed.tier !== "modelled" && feed.tier !== "derived" ? ` · ${tier.label}` : ""}
      </div>
    </div>
  );
}

/**
 * @param {Array}  specs  {key, label, base, amplitude, fmt, integration}
 * @param {string} note   optional line under the strip
 */
export default function LiveStrip({ specs, note }) {
  const feeds = useLiveFeeds(specs);
  const health = useMemo(() => integrationHealth(), []);
  const tone = { expired: C.gold, expiring: C.gold, connected: C.green }[health.summary.tone];

  return (
    <div style={{ marginBottom: 12 }}>
      <style>{`@keyframes stripPulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @media (prefers-reduced-motion: reduce){@keyframes stripPulse{0%,100%{opacity:1}}}`}</style>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {feeds.map((f) => <Tile key={f.key} feed={f} />)}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
        <span style={{ color: T.txt3, fontSize: 8.5, lineHeight: 1.5 }}>
          {note ?? "Readings move continuously around the reported figure. Hover any tile for its source."}
        </span>
        <span style={{ color: tone, fontSize: 8.5, whiteSpace: "nowrap" }}>● {health.summary.text}</span>
      </div>
    </div>
  );
}
