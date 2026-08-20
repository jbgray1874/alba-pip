# public/

Files here are served at the root of the site, unprocessed.

## logo.svg — the brand artwork

Drop the supplied Alba PIP logo here as **`logo.svg`** and push. The top bar and
the browser tab pick it up automatically; no code change is needed.

Until that file exists, `src/components/Marque.jsx` draws a fallback. The
fallback is a close redraw traced by eye from a screenshot — the structure is
right (an interlocking AP monogram, both counters hollow) but the proportions
are an approximation, and it should be replaced rather than lived with.

A PNG works too: name it `logo.png` and change the one `ARTWORK` constant at the
top of `Marque.jsx`. SVG is better — it stays sharp at 16px in a browser tab and
at 132px on a title slide.

The report sheet keeps the drawn version deliberately. It prints ink-on-cream,
and a supplied white-on-black file cannot be recoloured for paper.
