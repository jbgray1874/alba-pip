// The load hook behind register-jsx.mjs. Transforms .jsx through esbuild and
// fills in the two build-time values Vite would have supplied.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";

export async function load(url, context, nextLoad) {
  // .jsx for the syntax, and the project's own .js for the substitutions —
  // import.meta.env is read in src/lib/dataFeeds.js, which is plain JavaScript
  // and therefore skipped when the test is on the extension alone. Node then
  // hands it a real import.meta with no `env`, and two screens die reading an
  // API key off undefined. Node modules are left alone; they neither need the
  // transform nor benefit from it.
  const isSource = url.includes("/src/") && (url.endsWith(".jsx") || url.endsWith(".js"));
  if (!isSource || url.includes("/node_modules/")) return nextLoad(url, context);

  const source = await readFile(fileURLToPath(url), "utf8");
  const { code } = await transform(source, {
    loader: url.endsWith(".jsx") ? "jsx" : "js",
    format: "esm",
    target: "node20",
    sourcefile: fileURLToPath(url),
    // The automatic runtime, which is what Vite uses. esbuild defaults to the
    // classic one and rewrites every tag to React.createElement — and none of
    // these files import React, because with the automatic runtime they do not
    // need to. Left on the default, all twenty-one screens fail with "React is
    // not defined", which says nothing about the screens.
    jsx: "automatic",
    // The whole object, not four of its properties. Vite replaces these at
    // build time; naming them individually means the first screen to read a
    // fifth one — an API key, say — dies on the env rather than on itself.
    define: {
      "import.meta.env": JSON.stringify({
        BASE_URL: "/", DEV: false, PROD: true, MODE: "production", SSR: false,
      }),
    },
  });

  return { format: "module", source: code, shortCircuit: true };
}
