// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Provenance badge
//  ----------------------------------------------------------------------------
//  One badge for the whole platform, so LIVE means the same thing on every
//  screen. It takes its state from the fetch rather than from a constant, which
//  is the entire point: a badge that can only ever say "live" is decoration.
//
//  Hovering gives the definition of the tier. Where a source is live, the badge
//  carries the provider and a "last updated" that ticks on its own — the only
//  part of the claim a viewer can actually check.
// ════════════════════════════════════════════════════════════════════════════

import { TIERS } from "../lib/liveData.js";

export default function LiveBadge({ tier, detail, ago, pulse = false, size = "sm" }) {
  const t = typeof tier === "string" ? (TIERS[tier] ?? TIERS.pinned) : (tier ?? TIERS.pinned);
  const small = size === "sm";
  const isLive = t.id === "live";

  return (
    <span title={`${t.label} — ${t.definition}${detail ? `\n${detail}` : ""}`}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: small ? "1px 6px" : "2px 8px",
        borderRadius: 3, border: `1px solid ${t.colour}44`, background: `${t.colour}14`,
        color: t.colour, fontSize: small ? 8.5 : 9.5, fontWeight: 700, letterSpacing: "0.06em",
      }}>
        <span style={{
          width: 5, height: 5, borderRadius: "50%", background: t.colour, display: "inline-block",
          animation: pulse && isLive ? "livePulse 1.6s ease-in-out infinite" : "none",
        }} />
        {t.label}
      </span>
      {(ago || detail) && (
        <span style={{ color: "#3d5070", fontSize: small ? 8.5 : 9.5, whiteSpace: "nowrap" }}>
          {ago ? `updated ${ago}` : detail}
        </span>
      )}
      {pulse && (
        <style>{`@keyframes livePulse{0%,100%{opacity:1}50%{opacity:0.25}}
          @media (prefers-reduced-motion: reduce){@keyframes livePulse{0%,100%{opacity:1}}}`}</style>
      )}
    </span>
  );
}
