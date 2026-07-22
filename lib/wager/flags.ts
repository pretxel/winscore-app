/**
 * Feature flags and kill switches.
 * Server-enforced — client-side visibility is a convenience, not a security boundary.
 */

import { getWagerEnv } from "./env";

export interface WagerFlags {
  ui: boolean;
  init: boolean;
  deposits: boolean;
  settlement: boolean;
  killDeposits: boolean;
}

export function getWagerFlags(): WagerFlags {
  const env = getWagerEnv();
  return {
    ui: env.uiEnabled,
    init: env.uiEnabled, // UI must be enabled to init
    deposits: env.depositsEnabled,
    settlement: env.settlementEnabled,
    // Kill switch: blocks new deposits but never claims/refunds
    killDeposits: false,
  };
}

export function canInitWagerRound(): boolean {
  return getWagerFlags().init;
}

export function canDeposit(): boolean {
  const f = getWagerFlags();
  return f.deposits && !f.killDeposits;
}

export function canSettle(): boolean {
  return getWagerFlags().settlement;
}

export function assertCanDeposit(): void {
  if (!canDeposit()) {
    throw new Error("Deposits are currently disabled");
  }
}

export function assertCanSettle(): void {
  if (!canSettle()) {
    throw new Error("Settlement is currently disabled");
  }
}

/**
 * Eligibility check interface — deny-by-default hooks for compliance.
 * Devnet uses explicit test policy values.
 */
export interface EligibilityCheck {
  ageConfirmed: boolean;
  jurisdictionAccepted: boolean;
  selfExcluded: boolean;
  stakeLimitExceeded: boolean;
  participationLimitExceeded: boolean;
  termsVersionAccepted: string | null;
}

export function checkEligibility(
  check: EligibilityCheck,
): { eligible: boolean; reason?: string } {
  if (!check.ageConfirmed) {
    return { eligible: false, reason: "Age not confirmed" };
  }
  if (!check.jurisdictionAccepted) {
    return { eligible: false, reason: "Jurisdiction not accepted" };
  }
  if (check.selfExcluded) {
    return { eligible: false, reason: "Self-excluded" };
  }
  if (check.stakeLimitExceeded) {
    return { eligible: false, reason: "Stake limit exceeded" };
  }
  if (check.participationLimitExceeded) {
    return { eligible: false, reason: "Participation limit exceeded" };
  }
  if (!check.termsVersionAccepted) {
    return { eligible: false, reason: "Terms not accepted" };
  }
  return { eligible: true };
}
