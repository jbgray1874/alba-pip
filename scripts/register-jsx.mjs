// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — A loader that lets plain Node import the screens
//  ----------------------------------------------------------------------------
//  verify.mjs is static analysis: it reads the source as text. That is why it
//  could confirm a hundred and eighty things about the user guide and still
//  miss the one that mattered — a helper called without being imported, which
//  is only an error at the moment the function runs.
//
//  The fix is to actually run them, and to do that Node has to understand JSX
//  and the handful of things Vite provides that it does not. esbuild is already
//  here as part of Vite, so this adds no dependency: it transforms each .jsx on
//  the way in and substitutes the two build-time values the source refers to.
//
//  Registered with `node --import ./scripts/register-jsx.mjs`.
// ════════════════════════════════════════════════════════════════════════════

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./jsx-hooks.mjs", pathToFileURL("./scripts/"));
