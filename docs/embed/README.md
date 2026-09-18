# Which file is which

Four files in this repository are called something like `index.html`, and they
are for entirely different things. This note exists because that was confusing
enough to stop somebody mid-task.

| File | What it is |
|---|---|
| `/index.html` | **The platform's public page.** A React shell — about thirty lines, with the content drawn by the JavaScript beside it. Built and published by the Pages workflow. Do not hand-edit. |
| `/app.html` | **The platform itself**, behind the sign-in. Same shape. Do not hand-edit. |
| `/src/views/index.html` | An old standalone marketing page kept for reference. Not served. |
| `docs/embed/website-home-WITH-BUTTON.html` | **The one for Gerard.** alba-pip.com's home page with one line added. |

## docs/embed — the alba-pip.com files

alba-pip.com is a separate, hand-coded static site on GoDaddy cPanel hosting.
It is not in this repository; these are drop-in replacements for the one file
on it that needs changing.

### `website-home-WITH-BUTTON.html`

alba-pip.com's `index.html` with a second button in the hero, linking to the
platform. One line different from the live page, marked in place with a
comment. Written in the site's own `.button` / `.button-outline` classes so it
inherits the real styling rather than approximating it.

**Rename it to `index.html` when it goes on the server.** It is named this way
here so it cannot be confused with the platform's own index.html above.

One thing to check before the swap: the live page carries a GoDaddy
performance script below `</body>` (`_trfq`, `wsimg.com`). On cPanel hosting
that is normally injected at serve time rather than stored in the file, so it
is not included here. If it turns out to be in the real file, paste it back.

### `website-home-PREVIEW-ONLY.html`

The same page with its stylesheet, script and images pointed at
`https://alba-pip.com`, so it renders properly when opened from a downloads
folder instead of needing the assets beside it. Carries a red banner across
the top.

**Never upload this one.** It is for looking at.

Some browsers refuse to load a cross-origin stylesheet into a `file://` page,
in which case the preview appears unstyled. That is a browser rule rather than
a fault in the file; the reliable test is to upload
`website-home-WITH-BUTTON.html` to the server as `index-test.html` and visit
it there, where the assets sit alongside it.

### `homepage-button-albapip.html`

Just the change, in three variants — one line in the hero, a section of its
own, or a link in the navigation — each with the block to find in the live
`index.html`. Safer than replacing a whole file if somebody would rather add a
line than swap a page.

### `homepage-box.html`

A self-contained panel that depends on no stylesheet at all. Written before
the site's markup was known, kept for any future site that is not this one.
