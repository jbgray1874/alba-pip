// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Who is looking at this
//  ----------------------------------------------------------------------------
//  The top bar has shown a hard-coded "GM" since the first commit. That was
//  honest while there was no login — it was the approver's initials on a
//  prototype, not a claim about the viewer. It stops being honest the moment
//  there is a real sign-in, because then it is showing one person's initials to
//  a different person.
//
//  Static Web Apps publishes the signed-in identity at /.auth/me. There is no
//  library and no token handling to do: the host has already validated the
//  session before the request reaches the page, and this reads the result.
//
//  Everywhere else — local dev, GitHub Pages, a file:// copy — that endpoint
//  does not exist and the fetch fails. That is the normal case today, not an
//  error, so it is caught and the interface falls back to what it showed
//  before. Nothing about this is allowed to stop a screen rendering.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";

/** Initials from whatever the provider gave us — usually a work email address. */
function initialsOf(details) {
  const name = String(details ?? "").split("@")[0].replace(/[._-]+/g, " ").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** A readable name from an email local part: "james.gray" → "James Gray". */
function nameOf(details) {
  const raw = String(details ?? "");
  if (!raw.includes("@")) return raw;
  return raw.split("@")[0].replace(/[._-]+/g, " ")
    .split(/\s+/).filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * The signed-in user, or null where there is no sign-in.
 *
 * @returns {{name: string, initials: string, roles: string[], provider: string}|null}
 */
export function useIdentity() {
  const [who, setWho] = useState(null);

  useEffect(() => {
    let live = true;
    // AbortController rather than a bare fetch, so a viewer who navigates away
    // during the round trip does not leave a setState pointed at a dead
    // component.
    const stop = new AbortController();

    fetch("/.auth/me", { signal: stop.signal, headers: { accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const p = d?.clientPrincipal;
        if (!live || !p) return;
        setWho({
          name: nameOf(p.userDetails),
          initials: initialsOf(p.userDetails),
          roles: p.userRoles ?? [],
          provider: p.identityProvider ?? "",
        });
      })
      .catch(() => {
        // No auth in front of this build, which is the normal case today rather
        // than a fault. The browser still logs the failed request in its own
        // console — that is the network layer, not this, and catching here
        // cannot suppress it. What it does prevent is an unhandled rejection,
        // and what the null return prevents is a screen that will not render
        // because it was waiting to be told who is looking at it.
      });

    return () => { live = false; stop.abort(); };
  }, []);

  return who;
}

/** Where the host ends the session. Same path on every Static Web App. */
export const SIGN_OUT = "/.auth/logout";
