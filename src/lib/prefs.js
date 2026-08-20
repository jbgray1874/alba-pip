// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Viewer preferences
//  ----------------------------------------------------------------------------
//  Three settings that belong to the person looking at the screen rather than
//  to the data: which of the two landing pages opens first, how large the
//  interface is drawn, and whether the navigation panel is open or collapsed.
//
//  Both persist in localStorage so a rehearsal and the meeting that follows it
//  look the same, and both fall back safely — a browser with storage blocked
//  gets the defaults rather than an exception.
// ════════════════════════════════════════════════════════════════════════════

const KEY = "alba.prefs.v1";

/**
 * The two views that can be a landing page.
 *
 * Portfolio Health is the specification's entry point — the eight-minute
 * walkthrough starts there. The GP Dashboard was the original landing page and
 * is where the company drill-downs live, so whoever is presenting may well want
 * to open on it instead. Neither is "the" home; the viewer chooses.
 */
export const HOMES = [
  { id: "command", label: "Portfolio Health", blurb: "Fund-level aggregation across nine companies" },
  { id: "gp", label: "GP Dashboard", blurb: "Per-company detail and the finance drill-downs" },
];

/**
 * Interface scale.
 *
 * The prototype is drawn at a density that suits a large monitor: 340 of its
 * 578 type sizes are 10px or below. Rather than restyle every one of them and
 * change what fits on a screen, the whole interface is scaled — text, charts,
 * spacing and tables together — so nothing is dropped or truncated at any
 * setting. 100% is the density the screens were laid out at.
 */
export const SCALES = [
  { id: 1, label: "100%", blurb: "As designed — densest" },
  { id: 1.15, label: "115%", blurb: "Comfortable on a laptop" },
  { id: 1.3, label: "130%", blurb: "Presenting to a room" },
  { id: 1.5, label: "150%", blurb: "Screenshots and printing" },
];

/**
 * Whether the navigation panel shows its labels.
 *
 * It shipped for a while as a 52px icon-only rail, which is what the reference
 * screens draw. The reference screens have four or five destinations; this
 * build has nineteen, and nineteen unlabelled glyphs is not navigation. It is
 * open by default and collapses to the rail for anyone who wants the width
 * back, and the choice persists.
 */
const DEFAULTS = { home: "command", scale: 1, navOpen: true };

function read() {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const saved = JSON.parse(raw);
    return {
      // Validate rather than trust: a stored id from an older build that no
      // longer exists would otherwise render a blank screen on load.
      home: HOMES.some((h) => h.id === saved.home) ? saved.home : DEFAULTS.home,
      scale: SCALES.some((s) => s.id === saved.scale) ? saved.scale : DEFAULTS.scale,
      navOpen: typeof saved.navOpen === "boolean" ? saved.navOpen : DEFAULTS.navOpen,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function loadPrefs() {
  return read();
}

export function savePrefs(patch) {
  const next = { ...read(), ...patch };
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked or full. The setting still applies for this session.
  }
  return next;
}
