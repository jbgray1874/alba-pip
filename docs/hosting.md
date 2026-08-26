# Hosting

Where Alba PIP runs, and what it takes to move it.

## Today

**GitHub Pages**, from the public repo, published by `.github/workflows/pages.yml`
on every push to `main`. The workflow runs the verify suite before it builds, so
a push that breaks an arithmetic identity cannot reach the URL.

    https://jbgray1874.github.io/alba-pip/

It is a static host: files from a CDN, no server. Three consequences, all of
them deliberate rather than broken:

- The `/api` connectors — Xero, Stripe, HubSpot and the analytical layer — have
  nowhere to run, so Connect Xero is inert and every AI panel shows the grey
  *calculated* badge. Every figure on every screen is unaffected.
- There is no authentication and there cannot be. A static host has no server
  to check a credential against; a login written in the page would be a
  password inside a file the visitor has already downloaded.
- Pages on a **free** GitHub plan requires the repository to be **public**. Making
  it private switches the site off rather than protecting it.

## Adding demo.alba-pip.com

Two steps, and the build handles itself.

**1. DNS**, wherever alba-pip.com is hosted:

    Type   CNAME
    Name   demo
    Value  jbgray1874.github.io

**2. The repository:** create `public/CNAME` containing one line —

    demo.alba-pip.com

— and push. Vite copies it into the build, which is how GitHub Pages is told
about the domain.

That file is also the switch for the asset prefix. A *project* site is served
from `/alba-pip/` and its asset URLs must carry that prefix; a custom domain is
served from the root and the same prefix would 404 every asset and load a blank
page. `vite.config.js` looks for `public/CNAME` and sets the base accordingly,
so the domain and the prefix can never disagree. See the comment there.

Then in **Settings → Pages**, confirm the custom domain and tick **Enforce
HTTPS** once the certificate has issued — usually within the hour.

Do not create `public/CNAME` before the DNS record exists. GitHub will accept
the domain, the domain will not resolve, and the site is unreachable until one
or the other is undone.

## Adding a login: Azure Static Web Apps

The free tier carries a custom domain, a certificate, real authentication and
the API functions, and deploys from a private repository. `staticwebapp.config.json`
in the repository root is already written for it.

What that file does:

- Every route, including `/api/*`, requires the **`viewer`** role. Nothing is
  anonymous.
- An unauthenticated request is redirected to an Entra ID sign-in rather than
  shown a 401.
- The GitHub and Twitter identity providers are turned off by returning 404 on
  their login routes.

That last point matters more than it looks. Static Web Apps' built-in providers
authenticate *anyone* holding an account with them — the built-in `aad` provider
accepts any Microsoft account, not only accounts in your tenant. Requiring a
role rather than merely `authenticated` is what closes that: a person is only a
`viewer` if they have been invited, so signing in successfully is not the same
as getting in. Invitations are issued from the Static Web App's **Role
management** blade and the free tier allows 25.

To restrict by tenant instead of by invitation, register a **custom** Entra
provider against your own issuer URL and swap the `aad` redirect for it.

### Setting it up

1. Create a Static Web App in the Azure portal, free tier, and point it at this
   repository and the `main` branch.
2. Build settings: app location `/`, output location `dist`, API location empty
   for now — see below.
3. Azure writes its own deployment workflow into `.github/workflows` and commits
   it. Do not hand-write one; the deployment token is generated with the
   resource.
4. Invite the people who should see it under **Role management**, granting
   `viewer`.
5. Move the DNS CNAME from `jbgray1874.github.io` to the hostname Azure gives
   you.

### The headers, and the one that is deliberately not enforced yet

`globalHeaders` sets the usual four — no MIME sniffing, no framing by another
site, referrer trimmed on cross-origin requests, and HSTS so a browser that has
seen the site once refuses to talk to it over plain HTTP for a year afterwards.

The Content Security Policy is set as **`Content-Security-Policy-Report-Only`**,
and that is a decision rather than an oversight.

A CSP is a list of the only places a page may load anything from. Get it right
and script injection has nowhere to run. Get it slightly wrong and the page
breaks in production, silently, in a way that looks like a bug in the
application — a chart that does not draw, a font that falls back, a report that
will not build. This policy was written from what the code actually reaches for
(Google Fonts, the three market and news APIs, blob URLs for the PDF) but it has
never been served by Azure, because Azure is not serving anything yet.

Report-only means the browser checks every request against the policy, reports
what would have been blocked to its own console, and blocks nothing. So:

1. Deploy, open the app, and walk the eight-minute demo with the console open —
   including generating a PDF and using live FX, which are the two paths that
   touch the widest set of origins.
2. Anything the policy would have blocked appears as a CSP report. Add the
   origins that are genuinely needed.
3. When the console stays clean, rename the header to `Content-Security-Policy`
   and it starts enforcing.

Doing it the other way round — enforcing first and finding out from a user —
is how a security header becomes the thing everybody remembers as "the change
that broke the site", and the next one is fought for a year.

### The connectors need adapting first

The four handlers under `/api` are written to the Vercel signature:

    export default function handler(req, res) { … res.status(200).json(…) }

Azure Functions v4 uses a different one, returning a response object rather than
writing to `res`. The API calls themselves, the OAuth flow and the token
handling are all unaffected — it is the outermost function in each file that
changes. A thin adapter is the sensible shape, so the handlers stay portable
between hosts rather than being rewritten for this one.

Until that is done, leave the API location empty. The site deploys and runs
exactly as it does on Pages, with the connectors inert, and gains the login.

## Vercel

The other option, and the faster one if the login is not needed yet: the `/api`
handlers already match its signature, so the connectors work with no code change
at all. Password protection on a deployment is a paid feature, and there is no
role model, so it answers "make Connect Xero work" but not "put it behind a
company login".
