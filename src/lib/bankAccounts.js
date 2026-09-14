// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Bank accounts
//  ----------------------------------------------------------------------------
//  Cash was a single number per company. One figure, one badge, one runway
//  computed by dividing it by burn. That is fine until somebody asks the
//  question every operator asks, which is "which account is it in" — and the
//  honest answer for a real portfolio company is five.
//
//  Five accounts is not a display problem. It changes the arithmetic:
//
//    · Some of the balance is not spendable. A tax reserve, a debt service
//      reserve, client money held in escrow. Counting it toward runway
//      overstates runway, and it overstates it in the dangerous direction.
//    · Some of it is not reachable. Cash in a foreign subsidiary can be held
//      by withholding tax, exchange controls, or a minority shareholder who
//      has to agree to the dividend.
//    · Five accounts are five feeds. If one stops reporting, the total moves
//      or freezes and the headline says nothing about which fifth of it is
//      now a guess.
//
//  So the book below rolls up to exactly the figure every other screen already
//  shows — that identity is not negotiable, and there is a check on it — while
//  carrying the three things the total cannot: what is restricted, what
//  currency it is held in, and where each part was read from.
//
//  The banks are invented, for the same reason the customers in customers.js
//  are: this portfolio is a worked example, and a fictional company should not
//  be shown holding an account with a real bank. They are shaped by region so
//  they read as banks rather than as placeholders.
// ════════════════════════════════════════════════════════════════════════════

import { companyById } from "./companies.js";
import { regionOf } from "./customers.js";

// ── Banks ───────────────────────────────────────────────────────────────────

const BANKS = {
  UK:      ["Caldon & Bruce", "Northgate Commercial", "Strathmore Bank"],
  UAE:     ["Gulf Meridian Bank", "Al Waha Commercial", "Khor Fakkan Bank"],
  APAC:    ["Straits Union Bank", "Pacific Kestrel Bank", "Marina Commercial"],
  default: ["Ashgrove Commercial", "Bridgemont Bank", "Fielding & Crane"],
};

/** A plausible second currency for a company that operates beyond its home market. */
const SECOND_CURRENCY = { GBP: "EUR", USD: "EUR", SGD: "USD", AED: "USD" };

// ── The shapes an account comes in ──────────────────────────────────────────

/**
 * Each archetype carries its share of the balance and how much of that share
 * cannot be spent. `weight` is relative, not a percentage — the allocation
 * below normalises whatever set a company ends up with.
 *
 * `restricted` is the part that must not count toward runway, and every one of
 * them says why on the row rather than leaving a reader to infer it.
 */
const KINDS = {
  operating: {
    label: "Operating", weight: 40, restricted: 0, primary: true,
    note: "Day-to-day receipts and supplier payments. The burn leaves from here.",
  },
  payroll: {
    label: "Payroll", weight: 12, restricted: 0, primary: true,
    note: "Funded monthly from the operating account.",
  },
  deposit: {
    label: "Deposit", weight: 22, restricted: 0, primary: true,
    note: "Instant access. Counts toward runway in full.",
  },
  taxReserve: {
    label: "Tax reserve", weight: 10, restricted: 1, primary: true,
    why: "Set aside for VAT and payroll taxes already incurred",
    note: "Owed rather than held. Excluded from available cash.",
  },
  escrow: {
    label: "Client money", weight: 9, restricted: 1, primary: false,
    why: "Customer funds held on trust — not the company's to spend",
    note: "Segregated by regulation. Never available to the business.",
  },
  debtService: {
    label: "Debt service reserve", weight: 9, restricted: 1, primary: false,
    why: "Covenanted minimum balance under the facility agreement",
    note: "Drawing on it would breach the facility.",
  },
  foreign: {
    label: "Overseas operating", weight: 14, restricted: 0.6, primary: false,
    why: "Held in an overseas subsidiary — repatriation needs board approval and withholding tax",
    note: "Reachable, but not this quarter and not in full.",
  },
};

// ── Seeded draw ─────────────────────────────────────────────────────────────

function seedFrom(key) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Shares that sum to exactly `total`.
 *
 * Rounding each share on its own gives a column that adds to one either side of
 * the figure printed above it, which is the first thing a finance director
 * notices. Largest remainder puts the difference somewhere chosen.
 *
 * Four of the nine companies report in another currency and are restated, so
 * the total they have to add up to is not a whole number — 9763.78, not 9764.
 * The integer pass above can only ever reach the rounded figure, so whatever
 * fraction is left over is placed on the largest account at the end. Without
 * that the column adds to a pound either side of the headline on exactly the
 * companies whose numbers are hardest to check by eye.
 */
function allocate(weights, total) {
  const sum = weights.reduce((t, w) => t + w, 0) || 1;
  const raw = weights.map((w) => (w / sum) * total);
  const floors = raw.map(Math.floor);
  let left = Math.round(total) - floors.reduce((t, f) => t + f, 0);
  const order = raw.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac);
  const out = [...floors];
  for (let n = 0; left > 0; n = (n + 1) % order.length, left--) out[order[n].i] += 1;

  // The sub-unit remainder, onto the largest share — which is always the
  // operating account, and is never restricted, so it cannot make a restricted
  // figure land on a fraction of a penny.
  const biggest = out.reduce((best, v, i) => (v > out[best] ? i : best), 0);
  out[biggest] += total - out.reduce((t, v) => t + v, 0);
  return out;
}

/** Which kinds this company holds, in the order they should be listed. */
function kindsFor(co, rng) {
  const kinds = ["operating", "payroll", "deposit", "taxReserve"];

  // A payments business holds client money by regulation; it is the clearest
  // case of a balance that is on the bank statement and is not the company's.
  if (/FinTech|Payments/i.test(co?.sector ?? "")) kinds.push("escrow");

  // Anything operating outside its home market keeps a local account there.
  if (rng() > 0.45) kinds.push("foreign");

  // A facility with a covenanted minimum, on the larger and more leveraged.
  if (rng() > 0.6) kinds.push("debtService");

  return kinds;
}

// ── The book ────────────────────────────────────────────────────────────────

/**
 * The accounts behind one company's reported cash.
 *
 * The book is a function of the balance it is given, which is what makes it
 * safe to restate: the Cash scenario works in the company's own currency while
 * the portfolio works in the fund's, and calling this with each figure produces
 * two books that reconcile to their own headline rather than one book quietly
 * printed under the wrong unit. That was not hypothetical — the first wiring
 * put S$5,000k at the top of a screen and S$2,924k on the table below it.
 *
 * @param {string} id      company id from the registry
 * @param {number} balance the cash figure the accounts must sum to
 * @param {string} ccy     the currency that figure is stated in
 * @param {string} asOf    the ledger month everything is stated at
 * @param {number} [burn]  monthly net burn, in the same units — supply it and
 *                         the book returns both runway bases
 * @returns {{accounts: object[], balance: number, restricted: number,
 *            available: number, banks: number, reading: string, ccy: string,
 *            runway: number|null, availableRunway: number|null}}
 */
export function accountBook(id, balance, ccy = "GBP", asOf = "", burn = 0) {
  const co = companyById(id);
  const region = regionOf(co?.geo);
  const rng = makeRng(seedFrom(`accounts:${id}`));

  const banks = BANKS[region] ?? BANKS.default;
  const primaryBank = banks[Math.floor(rng() * banks.length)];
  const otherBank = banks.find((b) => b !== primaryBank) ?? primaryBank;

  const kinds = kindsFor(co, rng);
  const amounts = allocate(kinds.map((k) => KINDS[k].weight), balance);

  const accounts = kinds.map((key, i) => {
    const kind = KINDS[key];
    const amount = amounts[i];
    const restricted = Math.round(amount * kind.restricted);

    // The primary bank has a direct feed; anything held elsewhere arrives
    // through the ledger instead. That is the ordinary shape of it, and it is
    // why a company banking in two places cannot honestly badge its total LIVE.
    const atPrimary = kind.primary;

    return {
      id: `${id}-${key}`,
      key,
      label: kind.label,
      bank: atPrimary ? primaryBank : otherBank,
      ccy: key === "foreign" ? (SECOND_CURRENCY[ccy] ?? "USD") : ccy,
      balance: amount,
      restricted,
      available: amount - restricted,
      why: kind.why ?? null,
      note: kind.note,
      // A direct bank feed reads live; everything else is read off the ledger
      // and says so.
      feed: atPrimary ? "live" : "derived",
      asOf,
    };
  });

  const restricted = accounts.reduce((t, a) => t + a.restricted, 0);
  const uniqueBanks = new Set(accounts.map((a) => a.bank)).size;

  const available = balance - restricted;

  return {
    accounts,
    ccy,
    balance: accounts.reduce((t, a) => t + a.balance, 0),
    restricted,
    available,
    // Both bases, so no screen has to divide by burn itself and arrive at a
    // slightly different rounding from the one beside it.
    runway: burn ? +(balance / burn).toFixed(1) : null,
    availableRunway: burn ? +(available / burn).toFixed(1) : null,
    banks: uniqueBanks,
    // The aggregate is only as good as its weakest part. A total that reads
    // LIVE while a fifth of it was last seen on a ledger is the exact claim
    // this application exists not to make.
    reading: accounts.some((a) => a.feed === "simulated") ? "simulated"
           : accounts.some((a) => a.feed === "derived") ? "derived"
           : "live",
  };
}

/**
 * One line a screen can print above the table, and the agents can quote.
 *
 * Kept here rather than written at each call site because it is the sentence
 * that carries the whole argument, and three slightly different versions of it
 * is how a product stops sounding like it means one thing.
 */
export function availabilityNote(book, fmt) {
  if (!book.restricted) {
    return `All ${fmt(book.balance)} is available — no balance is restricted or held overseas.`;
  }
  const share = Math.round((book.restricted / book.balance) * 100);
  return `${fmt(book.available)} of ${fmt(book.balance)} is actually available. ` +
         `${fmt(book.restricted)} — ${share}% — is restricted across ` +
         `${book.accounts.filter((a) => a.restricted > 0).length} accounts and does not fund the burn.`;
}
