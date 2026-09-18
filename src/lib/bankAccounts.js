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
//  The banks are the real ones — HSBC, DBS, Standard Chartered and the rest —
//  chosen by where the company operates. That is a deliberate reversal of the
//  rule applied to customers in customers.js, and the distinction is worth
//  stating: naming an invented company as a CUSTOMER of a real business is a
//  claim about that business, while naming the bank a company holds an account
//  with is the same kind of statement as naming Xero as its ledger. It makes
//  the estate legible to anyone who has run a treasury function, which an
//  invented name never does.
//
//  Currency is the other half. An account is held IN a currency, and that is
//  the truth of it: the native amount is what the bank statement says, and
//  every figure in any other currency is derived from it at a rate that is
//  named. A single portfolio company can therefore hold GBP with HSBC London,
//  USD with HSBC Singapore and SGD with DBS, and the roll-up can be read in
//  any of the G10 plus SGD without any of those three numbers changing.
// ════════════════════════════════════════════════════════════════════════════

import { companyById } from "./companies.js";
import { regionOf } from "./customers.js";
import { convert } from "./fx.js";

// ── Banks ───────────────────────────────────────────────────────────────────

/**
 * Where a company of each shape actually banks, most likely first.
 *
 * `home` is the domestic relationship that carries the operating accounts;
 * `overseas` is the second bank a company picks up when it opens somewhere
 * else, which is why the two lists overlap — HSBC and Standard Chartered are
 * on both sides in every region, because that is the point of them.
 */
const BANKS = {
  UK: {
    home: ["HSBC", "Barclays", "NatWest", "Lloyds Bank"],
    overseas: ["HSBC", "Standard Chartered", "Citi"],
  },
  UAE: {
    home: ["Emirates NBD", "Mashreq", "First Abu Dhabi Bank"],
    overseas: ["HSBC", "Standard Chartered", "Citi"],
  },
  APAC: {
    home: ["DBS", "OCBC", "United Overseas Bank"],
    overseas: ["HSBC", "Standard Chartered", "Citi"],
  },
  default: {
    home: ["HSBC", "Citi", "BNP Paribas"],
    overseas: ["HSBC", "Standard Chartered", "Citi"],
  },
};

/**
 * The currency each kind of account is held in.
 *
 * Operating, payroll and tax sit in the currency the company reports and pays
 * people in. The rest are where multi-currency actually shows up: a treasury
 * deposit parked in the reserve currency, client money in whatever the
 * customers pay in, an overseas account in the local unit.
 */
const REGION_CURRENCY = { UK: "GBP", UAE: "AED", APAC: "SGD", default: "EUR" };

/** Where a company of this shape most plausibly opens its second market. */
const OVERSEAS_CURRENCY = { GBP: "USD", AED: "USD", SGD: "USD", USD: "EUR", EUR: "USD" };

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

  const pool = BANKS[region] ?? BANKS.default;
  const homeBank = pool.home[Math.floor(rng() * pool.home.length)];
  const overseasBank = pool.overseas[Math.floor(rng() * pool.overseas.length)];

  // The two currencies this company deals in: the one it reports and pays
  // people in, and the one its overseas arm operates in.
  //
  // Home comes from the COMPANY, not from `ccy`. `ccy` is only the unit the
  // totals are stated in — the fund's reporting currency on the portfolio, the
  // company's own on the cash screen — and taking the home currency from it
  // put a Singapore company's payroll account in sterling and left Emirates NBD
  // holding GBP for a UK business.
  const homeCcy = co?.currency ?? REGION_CURRENCY[region] ?? ccy;
  const awayCcy = OVERSEAS_CURRENCY[homeCcy] ?? "USD";

  const kinds = kindsFor(co, rng);
  const amounts = allocate(kinds.map((k) => KINDS[k].weight), balance);

  const accounts = kinds.map((key, i) => {
    const kind = KINDS[key];
    const amount = amounts[i];
    const restricted = amount * kind.restricted;

    // Where a company banks more than once, only the home relationship has a
    // direct feed; the rest arrives through the ledger. That is the ordinary
    // shape of it and it is why a company banking in two places cannot
    // honestly badge its total LIVE.
    const atHome = kind.primary;

    // What the account is actually denominated in. A treasury deposit is
    // parked in the reserve currency whatever the company reports in, client
    // money sits in whatever customers pay, and the overseas account is in the
    // local unit. Everything operational stays home.
    const accountCcy =
      key === "foreign" ? awayCcy
      : key === "deposit" ? (homeCcy === "USD" ? "EUR" : "USD")
      : key === "escrow" ? awayCcy
      : homeCcy;

    return {
      id: `${id}-${key}`,
      key,
      label: kind.label,
      bank: atHome ? homeBank : overseasBank,
      ccy: accountCcy,
      // The native amount is the truth — it is what the bank statement says.
      // It is derived from the allocated share rather than the other way round,
      // so converting the book back into `ccy` reproduces the reported balance
      // exactly rather than approximately.
      native: convert(amount, ccy, accountCcy),
      nativeRestricted: convert(restricted, ccy, accountCcy),
      // The same money in the book's base currency, for callers that want one
      // number and no conversion of their own.
      balance: amount,
      restricted,
      available: amount - restricted,
      why: kind.why ?? null,
      note: kind.note,
      feed: atHome ? "live" : "derived",
      asOf,
    };
  });

  const restricted = accounts.reduce((t, a) => t + a.restricted, 0);
  const available = balance - restricted;

  return {
    accounts,
    ccy,
    base: ccy,
    balance: accounts.reduce((t, a) => t + a.balance, 0),
    restricted,
    available,
    // Both bases, so no screen has to divide by burn itself and arrive at a
    // slightly different rounding from the one beside it.
    runway: burn ? +(balance / burn).toFixed(1) : null,
    availableRunway: burn ? +(available / burn).toFixed(1) : null,
    burn,
    banks: new Set(accounts.map((a) => a.bank)).size,
    currencies: new Set(accounts.map((a) => a.ccy)).size,
    // The aggregate is only as good as its weakest part. A total that reads
    // LIVE while a fifth of it was last seen on a ledger is the exact claim
    // this application exists not to make.
    reading: accounts.some((a) => a.feed === "simulated") ? "simulated"
           : accounts.some((a) => a.feed === "derived") ? "derived"
           : "live",
  };
}

/**
 * The same accounts, read in another currency.
 *
 * Every figure is converted from each account's NATIVE amount rather than from
 * the book's base, so the answer does not depend on the route taken to get
 * there — reading a Singapore book in yen gives the same total whether the base
 * was SGD or GBP. Converting the base total instead would be one rounding
 * cheaper and would quietly disagree with the column beneath it.
 *
 * The native amounts never move. Switching the display currency restates what
 * is held; it does not revalue it, and the table keeps saying what the bank
 * statement says in the column beside the converted figure.
 *
 * @param {object} book from accountBook()
 * @param {string} to   any currency in the FX table
 */
export function viewIn(book, to) {
  if (!book || to === book.base) return book;

  const accounts = book.accounts.map((a) => {
    const balance = convert(a.native, a.ccy, to);
    const restricted = convert(a.nativeRestricted, a.ccy, to);
    return { ...a, balance, restricted, available: balance - restricted };
  });

  const balance = accounts.reduce((t, a) => t + a.balance, 0);
  const restricted = accounts.reduce((t, a) => t + a.restricted, 0);
  const available = balance - restricted;
  // Burn is a flow in the base currency; it has to move with the total or the
  // runway would change every time somebody switched the display.
  const burn = book.burn ? convert(book.burn, book.base, to) : 0;

  return {
    ...book,
    accounts,
    ccy: to,
    balance,
    restricted,
    available,
    burn,
    runway: burn ? +(balance / burn).toFixed(1) : book.runway,
    availableRunway: burn ? +(available / burn).toFixed(1) : book.availableRunway,
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
