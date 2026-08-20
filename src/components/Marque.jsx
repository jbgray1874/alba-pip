// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — The marque
//  ----------------------------------------------------------------------------
//  One definition of the logo, used by the top bar, the report sheet and the
//  browser tab. It was drawn twice before this from guesses — the site is
//  unreachable from the build environment — and both were wrong in different
//  ways, so it now lives in one file that everything else imports.
//
//  The mark is an interlocking AP monogram, both letters hollow:
//
//    · the A is a triangle with a triangular counter, its base forming the
//      crossbar
//    · the P sits behind it, stem to the left of a hollow bowl
//    · the A's right leg crosses OVER the P's stem, and the weave is what makes
//      it read as one mark rather than two letters. That crossing is drawn as a
//      stroke in the background colour, so it holds on any ground.
//
//  Because the counters are what give it its shape, it is built from filled
//  paths with `evenodd` winding rather than from strokes. A stroked version
//  greys out below about 24px; this one holds at 16px, which is the tab.
// ════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { C } from "../lib/theme.js";

/**
 * Where the real artwork goes.
 *
 * Drop the supplied file at `public/logo.svg`, `.png` or `.jpg` and push. Every
 * mark in the application picks it up — top bar, browser tab — with no code
 * change. They are tried in that order and the first that loads wins, so any of
 * the three works without anybody editing this file.
 *
 * This exists because the mark was redrawn three times from a raster
 * screenshot, each pass closer and none of them right. Tracing a logo by eye is
 * the wrong tool; the file is the right one, and the code should not need
 * editing when it turns up.
 */
const ARTWORK = ["logo.svg", "logo.png", "logo.jpg"].map((f) => `${import.meta.env.BASE_URL}${f}`);

/**
 * A JPEG cannot carry transparency, so a white-on-black logo arrives as a white
 * mark inside a black rectangle. Against this interface that rectangle is
 * visible — near-black on near-black still shows a seam.
 *
 * `screen` blending drops every black pixel to nothing and leaves the white
 * untouched, which knocks the box out cleanly. It is applied to JPEGs only:
 * a PNG or SVG carries its own alpha and blending one would erase any dark
 * part of the artwork.
 */
const knockout = (src) => (/\.jpe?g$/i.test(src) ? { mixBlendMode: "screen" } : null);

/**
 * The mark alone, no wordmark.
 *
 * Uses the supplied artwork when it is present. The drawn fallback is a close
 * redraw, not the original: an interlocking AP monogram with both counters
 * hollow, the A crossing over the P.
 *
 * @param {number}  size    rendered px — the viewBox is square so it scales cleanly
 * @param {string}  colour  the letterforms, drawn fallback only
 * @param {string}  ground  the gap where the A crosses the P; must match what sits
 *                          behind the mark or the weave fills in
 * @param {boolean} drawn   force the drawn version — used on the report sheet,
 *                          where the mark has to be ink on cream and a supplied
 *                          white-on-black file could not be recoloured
 */
export function Mark({ size = 20, colour = C.txt1, ground = C.bg, drawn = false, ink = false }) {
  // Walk the candidate files; -1 means every one failed, so draw it instead.
  const [candidate, setCandidate] = useState(drawn ? -1 : 0);

  if (candidate >= 0 && candidate < ARTWORK.length) {
    const src = ARTWORK[candidate];
    return (
      <img key={src} src={src} width={size} height={size} alt="Alba PIP"
           onError={() => setCandidate(candidate + 1)}
           style={{
             flexShrink: 0, display: "block", objectFit: "contain",
             // The supplied artwork is light-on-transparent, which is right for
             // the interface and wrong for the report, where the sheet is cream
             // and everything else on it is ink. Inverting is exact here because
             // the mark is a single flat colour.
             ...(ink ? { filter: "invert(1)" } : null),
             ...knockout(src),
           }} />
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"
         role="img" aria-label="Alba PIP" style={{ flexShrink: 0, display: "block" }}>
      {/* P — stem, then the bowl; the counter is the second subpath */}
      <path
        d="M35 7 H74 A26 26 0 0 1 74 59 H48 V94 H35 Z
           M48 20 H74 A13 13 0 0 1 74 46 H48 Z"
        fill={colour} fillRule="evenodd" />

      {/* A — a symmetric triangle with a triangular counter, so the band below
          the counter reads as the crossbar. Drawn over the P; the ground-coloured
          stroke is the gap that makes the two letters weave rather than merge. */}
      <path
        d="M0 94 L38 28 L76 94 Z
           M18 82 L38 48 L58 82 Z"
        fill={colour} fillRule="evenodd"
        stroke={ground} strokeWidth="4.5" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Mark plus wordmark, horizontal — the lockup the application chrome uses.
 *
 * The supplied artwork sets ALBA PIP at roughly a third of an em of tracking.
 * That is wide, and it is the single most recognisable thing about the wordmark
 * after the monogram itself, so it is matched rather than tidied up.
 */
export function Wordmark({ compact = false, size = 22, colour = C.txt1, ground = C.bg }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
      <Mark size={size} colour={colour} ground={ground} />
      {!compact && (
        <span style={{ color: colour, fontSize: 11, fontWeight: 500, letterSpacing: "0.3em",
                       whiteSpace: "nowrap" }}>
          ALBA PIP
        </span>
      )}
    </div>
  );
}

/**
 * The same geometry as a standalone SVG string, for the favicon data URI and
 * for the standalone HTML the report export writes. Kept here so the tab icon
 * and the top-bar mark cannot drift apart, which is what happened last time.
 *
 * @param {string} colour hex, without the leading hash escaped for a data URI
 */
export function markSvg(colour = "%23F2F2F0", ground = "%230A0A0B") {
  return (
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>" +
    `<path d='M35 7 H74 A26 26 0 0 1 74 59 H48 V94 H35 Z M48 20 H74 A13 13 0 0 1 74 46 H48 Z' fill='${colour}' fill-rule='evenodd'/>` +
    `<path d='M0 94 L38 28 L76 94 Z M18 82 L38 48 L58 82 Z' fill='${colour}' fill-rule='evenodd' stroke='${ground}' stroke-width='4.5' stroke-linejoin='round'/>` +
    "</svg>"
  );
}
