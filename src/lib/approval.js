// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Plan approval
//  ----------------------------------------------------------------------------
//  The two plan screens each led with a gold primary button — APPROVE PLAN and
//  APPROVE CAMPAIGN — wired to nothing. A gold button that does nothing is the
//  worst control on a demo screen: it is the one thing in the room somebody
//  will reach for, and it fails silently in front of the person you are
//  selling to.
//
//  Approving is a real state change, so it is modelled as one. The plan records
//  who approved it and when, the status chip moves from awaiting approval to
//  approved, and the actions become the approver's rather than Alba's. It
//  persists for the session so a demo that approves a plan and navigates away
//  does not silently un-approve it.
//
//  What it deliberately does NOT do is claim to have written anywhere. There is
//  no back end behind this yet, and the screen says so.
// ════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import { AS_OF_DATE } from "./liveFeed.js";

const KEY = "alba.approvals.v1";

/**
 * The two people behind Alba PIP.
 *
 * The top bar carries their initials, and one of them signs plans off. Held
 * here rather than typed into each screen so the top bar and the two plan
 * screens cannot disagree about who somebody is or what they do.
 */
export const TEAM = [
  { name: "James Gray", initials: "JG", role: "Co-Founder & CTO" },
  { name: "Gerard Milligan", initials: "GM", role: "Co-Founder & CEO" },
];

/**
 * Who is approving.
 *
 * A plan is a commitment the firm makes, so it carries the CEO's name rather
 * than whoever happens to have the screen open.
 */
export const APPROVER = TEAM.find((p) => p.initials === "GM");

function readAll() {
  try {
    const raw = globalThis.sessionStorage?.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(next) {
  try {
    globalThis.sessionStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked. The approval still holds for as long as the view is mounted.
  }
}

/**
 * Approval state for one plan.
 *
 * @param {string} planId a stable id for the plan being approved
 * @returns {{approved: boolean, by: object|null, on: string|null, approve: Function, withdraw: Function}}
 */
export function useApproval(planId) {
  const [record, setRecord] = useState(() => readAll()[planId] ?? null);

  // A second screen approving the same plan, or a reload inside the session,
  // should be reflected here rather than showing a stale chip.
  useEffect(() => { setRecord(readAll()[planId] ?? null); }, [planId]);

  const approve = useCallback(() => {
    const next = { by: APPROVER, on: AS_OF_DATE };
    const all = readAll();
    all[planId] = next;
    writeAll(all);
    setRecord(next);
  }, [planId]);

  const withdraw = useCallback(() => {
    const all = readAll();
    delete all[planId];
    writeAll(all);
    setRecord(null);
  }, [planId]);

  return {
    approved: Boolean(record),
    by: record?.by ?? null,
    on: record?.on ?? null,
    approve,
    withdraw,
  };
}
