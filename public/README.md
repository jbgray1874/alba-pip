# public/

Files here are served at the root of the site, unprocessed.

## logo — the brand artwork

Drop the supplied Alba PIP logo here and push. The top bar and the browser tab
pick it up automatically; no code change is needed.

Three names are tried in order, and the first that loads wins:

| File | Verdict |
|---|---|
| `logo.svg` | **Best.** Sharp at 16px in a browser tab and at 132px on a title slide, and it carries transparency. |
| `logo.png` | Good, provided it was exported with a transparent background. |
| `logo.jpg` | Works, with a caveat — see below. |

### If it is a JPEG

JPEG cannot carry transparency, so a white-on-black logo arrives as a white mark
inside a black rectangle, and against this interface that rectangle is visible —
near-black on near-black still shows a seam. The mark is therefore composited
with `mix-blend-mode: screen` when the file is a JPEG, which drops every black
pixel to nothing and leaves the white untouched.

That handles the box. It does not handle the other JPEG problem: the format is
built for photographs, and hard-edged strokes pick up ringing artefacts around
them, which is most visible at the 20px the top bar uses. It will look
acceptable. It will not look as good as an SVG.

The knockout also assumes the artwork is light on a dark ground. A dark logo on
white needs `multiply` rather than `screen` — one word in `Marque.jsx`.

### The fallback

Until one of those files exists, `src/components/Marque.jsx` draws its own. The
structure is right — an interlocking AP monogram, both counters hollow — but the
proportions were traced by eye from a screenshot and are an approximation. It is
there so the chrome is never empty, not because it is good enough to keep.

### The report sheet

That keeps the drawn version deliberately. It prints ink-on-cream, and a
white-on-black file cannot be recoloured for paper.
