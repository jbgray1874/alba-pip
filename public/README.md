# public/

Files here are served at the root of the site, unprocessed.

## logo.png — the brand artwork  ✅ present

The Alba PIP marque: the AP monogram, white on transparency, tight-cropped with
a small optical margin. The top bar and the report sheet both draw from it, and
`favicon.png` beside it is the same mark squared off for a browser tab.

It was extracted from a phone screenshot of the logo — the only source
available. The black ground was opaque, so the alpha channel was rebuilt from
the image's own luminance, which keeps every anti-aliased edge rather than
stair-stepping them at the 22px the top bar uses. The "38" notification, the
home indicator and the ALBA PIP wordmark below the monogram were all cropped
out; the application sets that wordmark itself, in its own tracking, so a file
containing it would print it twice.

**Replace this with the original vector when it turns up.** `logo.svg` is tried
before `logo.png`, so dropping one in is all it takes — no code change. A true
vector will be sharper in a browser tab and will not soften if the mark is ever
used large.

## What the code does with it

`src/components/Marque.jsx` tries `logo.svg`, then `logo.png`, then `logo.jpg`,
and falls back to a drawn approximation if none is present. A JPEG is
composited with `mix-blend-mode: screen` to knock out the black it cannot make
transparent; that assumes light artwork on a dark ground, and a dark logo on
white would want `multiply` instead.

The report sheet inverts the artwork to ink, which is exact here because the
mark is a single flat colour.
