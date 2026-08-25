// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — The public page
//  ----------------------------------------------------------------------------
//  What somebody sees before they are allowed in. It is the only page in the
//  application that is not behind the login, which is why it is a separate
//  entry point rather than a view inside the app: a single-page bundle cannot
//  be half public, and file-level protection is the only kind a host can
//  actually enforce. See staticwebapp.config.json.
//
//  The tone is deliberate. This product's argument is that it does not overstate
//  what it knows — every figure on every screen names its source, and one that
//  loses its source says so. Marketing copy that oversold it would undo that in
//  a sentence, in front of exactly the audience trained to notice. So the claims
//  here are the ones the screens can actually support, and the counts are read
//  from the registries rather than typed, for the same reason as everywhere
//  else: a number nobody maintains is a number that goes quietly wrong.
// ════════════════════════════════════════════════════════════════════════════

import { C, F, S, label as labelStyle } from "../lib/theme.js";
import { Mark } from "../components/Marque.jsx";
import { COMPANIES } from "../lib/companies.js";
import { INTEGRATIONS } from "../lib/liveFeed.js";

/** Where the application itself lives. */
const APP = `${import.meta.env.BASE_URL}app.html`;

const MEASURE = 1080;

/**
 * Somebody signed in successfully and is not on the access list.
 *
 * Signing in and being let in are two different things here — the host admits
 * any Microsoft account and the invited role is what actually grants entry.
 * Without this the host answers that case with a bare 403, which reads as a
 * broken site rather than as a closed door, and the person it happens to is by
 * definition somebody who was interested enough to try.
 *
 * The host redirects them here instead. Read once, on load, from the query the
 * redirect carries.
 */
function wasDenied() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("denied");
}

// ── Parts ───────────────────────────────────────────────────────────────────

function Shell({ children, pad = "0 28px" }) {
  return <div style={{ maxWidth: MEASURE, margin: "0 auto", padding: pad }}>{children}</div>;
}

function SignIn({ size = "normal" }) {
  const big = size === "large";
  return (
    <a href={APP}
       style={{
         display: "inline-flex", alignItems: "center", gap: 9, textDecoration: "none",
         background: C.gold, color: C.goldOn, borderRadius: 5,
         padding: big ? "13px 26px" : "8px 17px",
         fontFamily: F.sans, fontWeight: 600, fontSize: big ? 13 : S.label,
         letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap",
       }}>
      Sign in
    </a>
  );
}

/** One of the three claims, each answering a question a partner actually asks. */
function Claim({ n, title, children }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 11 }}>
        <span style={{ color: C.gold, fontFamily: F.mono, fontSize: 11 }}>{n}</span>
        <h3 style={{ color: C.txt1, fontSize: 17, fontWeight: 500, margin: 0,
                     letterSpacing: "-0.01em", textWrap: "balance", lineHeight: 1.3 }}>
          {title}
        </h3>
      </div>
      <p style={{ color: C.txt2, fontSize: 13, lineHeight: 1.75, margin: 0 }}>{children}</p>
    </div>
  );
}

function Figure({ value, of }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: C.txt1, fontSize: 26, fontWeight: 300, letterSpacing: "-0.02em",
                    fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ ...labelStyle(), marginTop: 6 }}>{of}</div>
    </div>
  );
}

// ── The page ────────────────────────────────────────────────────────────────

export default function Landing() {
  const denied = wasDenied();
  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: F.sans,
                  WebkitFontSmoothing: "antialiased" }}>
      <style>{`
        .alba-claims { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
        .alba-figures { display: grid; grid-template-columns: repeat(4, 1fr); gap: 26px; }
        .alba-close { display: grid; grid-template-columns: 1.3fr 1fr; gap: 44px; align-items: start; }
        .alba-hero-h1 { font-size: 52px; }
        @media (max-width: 900px) {
          .alba-claims, .alba-close { grid-template-columns: 1fr; gap: 30px; }
          .alba-figures { grid-template-columns: repeat(2, 1fr); }
          .alba-hero-h1 { font-size: 36px; }
        }
        a:focus-visible, [href]:focus-visible {
          outline: 2px solid ${C.gold}; outline-offset: 3px;
        }
      `}</style>

      {/* ── Masthead ── */}
      <header style={{ borderBottom: `1px solid ${C.border}` }}>
        <Shell pad="0 28px">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                        gap: 16, minHeight: 62, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <Mark size={24} />
              <span style={{ color: C.txt1, fontSize: 12, fontWeight: 500, letterSpacing: "0.3em" }}>
                ALBA PIP
              </span>
            </div>
            <SignIn />
          </div>
        </Shell>
      </header>

      {/* ── Signed in, but not on the list ── */}
      {denied && (
        <div style={{ background: C.amberSoft, borderBottom: `1px solid ${C.gold}55` }}>
          <Shell pad="14px 28px">
            <div style={{ display: "flex", gap: 11, alignItems: "flex-start", flexWrap: "wrap" }}>
              <span style={{ color: C.gold, fontSize: 13, lineHeight: 1.4, flexShrink: 0 }}>▲</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: C.txt1, fontSize: 13, fontWeight: 500 }}>
                  That account is not on the access list
                </div>
                <div style={{ color: C.txt2, fontSize: S.small, lineHeight: 1.6, marginTop: 4,
                              maxWidth: 660 }}>
                  You signed in, which worked — the platform is by invitation, and your account has
                  not been added to it yet. Ask your Caledonia Alba contact to invite you, or{" "}
                  <a href="/.auth/logout" style={{ color: C.gold }}>sign out</a> and try a different
                  account.
                </div>
              </div>
            </div>
          </Shell>
        </div>
      )}

      {/* ── Hero ── */}
      <section>
        <Shell pad="76px 28px 60px">
          <div style={{ ...labelStyle(C.gold), marginBottom: 22 }}>
            Portfolio intelligence for private capital
          </div>
          <h1 className="alba-hero-h1"
              style={{ color: C.txt1, fontWeight: 300, margin: 0, lineHeight: 1.12,
                       letterSpacing: "-0.03em", textWrap: "balance", maxWidth: 780 }}>
            Know before the board pack does.
          </h1>
          <p style={{ color: C.txt2, fontSize: 16, lineHeight: 1.7, margin: "24px 0 0",
                      maxWidth: 620 }}>
            Alba PIP reads the systems your portfolio companies already run, tells you which one
            needs attention, and shows its working — every figure traceable to the ledger it
            came from.
          </p>
          <div style={{ marginTop: 34, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <SignIn size="large" />
            <span style={{ color: C.txt3, fontSize: S.small }}>Access is by invitation</span>
          </div>
        </Shell>
      </section>

      {/* ── The three claims ── */}
      <section style={{ borderTop: `1px solid ${C.border}`, background: C.bgDeep }}>
        <Shell pad="52px 28px">
          <div className="alba-claims">
            <Claim n="01" title="It reads the indicators that move first">
              Revenue against plan tells you what has already happened. Alba PIP watches what moves
              ahead of it — pipeline coverage, win rate, deal timing, attrition — and raises the
              alert when those turn, not when the P&amp;L catches up. On the worked example that is
              seven weeks before the board meeting that would have found it.
            </Claim>
            <Claim n="02" title="Every figure says where it came from">
              Live, from the ledger, modelled, or pinned — no number on any screen is
              unattributed. A reading whose source stops answering is relabelled rather than left
              looking authoritative, because a dashboard that cannot tell you which of its numbers
              to trust is one you check by hand anyway.
            </Claim>
            <Claim n="03" title="The output is a document, not a screenshot">
              An investigation becomes an A4 report with the ranked causes, the evidence and the
              methodology stated — real type, so it can be searched and quoted. Ready to circulate
              after the meeting rather than rebuilt in PowerPoint before the next one.
            </Claim>
          </div>
        </Shell>
      </section>

      {/* ── What it is, in figures ── */}
      <section style={{ borderTop: `1px solid ${C.border}` }}>
        <Shell pad="40px 28px">
          <div className="alba-figures">
            <Figure value={COMPANIES.length} of="Portfolio companies" />
            <Figure value={INTEGRATIONS.length} of="Connected systems" />
            <Figure value={new Set(COMPANIES.map((c) => c.currency)).size} of="Reporting currencies" />
            <Figure value="0" of="Figures typed by hand" />
          </div>
          <div style={{ color: C.txt3, fontSize: S.small, lineHeight: 1.7, marginTop: 26,
                        maxWidth: 720 }}>
            Accounting, banking, billing, CRM, HR and market data. Companies reporting in another
            currency are restated at a rate that names itself and its age, because a portfolio that
            silently revalues between the rehearsal and the meeting is worse than one that is a
            fortnight stale.
          </div>
        </Shell>
      </section>

      {/* ── Sign in ── */}
      <section style={{ borderTop: `1px solid ${C.border}`, background: C.bgDeep }}>
        <Shell pad="52px 28px">
          <div className="alba-close">
            <div style={{ minWidth: 0 }}>
              <h2 style={{ color: C.txt1, fontSize: 24, fontWeight: 300, margin: 0,
                           letterSpacing: "-0.02em", textWrap: "balance" }}>
                See it against a live portfolio
              </h2>
              <p style={{ color: C.txt2, fontSize: 14, lineHeight: 1.75, margin: "16px 0 0" }}>
                The platform is running now, populated end to end — nine companies across three
                currencies, every screen calculated from the same finance model rather than
                mocked up. Sign in and start on Portfolio Health; the built-in guide walks the
                whole thing in eight minutes.
              </p>
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.borderLt}`, borderRadius: 8,
                          padding: "22px 22px 20px" }}>
              <div style={labelStyle(C.txt2)}>Access</div>
              <div style={{ color: C.txt1, fontSize: 15, marginTop: 10, lineHeight: 1.5 }}>
                By invitation
              </div>
              <p style={{ color: C.txt3, fontSize: S.small, lineHeight: 1.65, margin: "10px 0 18px" }}>
                Sign in with your work account. If you have not been invited and would like to
                see the platform, ask your Caledonia Alba contact.
              </p>
              <SignIn size="large" />
            </div>
          </div>
        </Shell>
      </section>

      {/* ── Foot ── */}
      <footer style={{ borderTop: `1px solid ${C.border}` }}>
        <Shell pad="22px 28px 30px">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16,
                        flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <Mark size={16} />
              <span style={{ color: C.txt3, fontSize: S.small }}>
                Alba PIP · Caledonia Alba
              </span>
            </div>
            <span style={{ color: C.txt3, fontSize: S.micro, lineHeight: 1.6, maxWidth: 560 }}>
              The portfolio shown is a worked example. Company names, ledgers and figures are
              generated for demonstration and are not those of any real business.
            </span>
          </div>
        </Shell>
      </footer>
    </div>
  );
}
