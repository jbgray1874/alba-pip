import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves a project site from a sub-path — jbgray1874.github.io/alba-pip
// — so the built asset URLs have to carry that prefix, or the page loads as a
// blank screen with three 404s in the console. Everywhere else — local dev,
// Vercel, the self-contained artifact — serves from the root, so the prefix is
// opt-in and set only by the Pages workflow.
const base = process.env.GITHUB_PAGES ? '/alba-pip/' : '/'

export default defineConfig({
  base,
  plugins: [react()],
})
