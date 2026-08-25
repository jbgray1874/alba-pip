import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Where the built asset URLs point.
//
// A GitHub Pages *project* site is served from a sub-path —
// jbgray1874.github.io/alba-pip — so every asset URL has to carry that prefix
// or the page loads as a blank screen with three 404s in the console.
//
// Every other host serves from the root: local dev, Vercel, Azure Static Web
// Apps, and — the case this exists for — GitHub Pages once a custom domain is
// attached. demo.alba-pip.com is a site in its own right, not a folder inside
// one, so the prefix has to come off at exactly the moment the domain goes on.
//
// GitHub signals a custom domain with a CNAME file in the published output, so
// that file is the switch. Adding public/CNAME both tells Pages the domain and
// moves the build to root-relative URLs, in one action, with nothing to
// remember. Removing it puts both back.
const cname = fileURLToPath(new URL('./public/CNAME', import.meta.url))
const customDomain = existsSync(cname)

const base = customDomain ? '/' : process.env.GITHUB_PAGES ? '/alba-pip/' : '/'

// Two documents, not one.
//
// index.html is the public page and app.html is the application. They are
// separate files because the login has to sit between them, and a host can only
// enforce access on a file — a single bundle that decided for itself would be
// deciding in code the visitor has already downloaded.
const input = {
  landing: fileURLToPath(new URL('./index.html', import.meta.url)),
  app: fileURLToPath(new URL('./app.html', import.meta.url)),
}

export default defineConfig({
  base,
  plugins: [react()],
  build: { rollupOptions: { input } },
})
