/**
 * The five welcome-tour steps, as data rather than components.
 *
 * Every step shares one shape — eyebrow, title, body — and only `wallet` adds
 * interactive content, so a list plus one renderer beats five near-identical
 * components. Copy lives in the `welcome` i18n namespace, keyed by step id.
 */

export interface WelcomeStep {
  id: "scoring" | "pools" | "wagers" | "wallet" | "risk";
  icon: "TrophyIcon" | "UsersIcon" | "CoinsIcon" | "WalletIcon" | "ShieldAlertIcon";
}

export const WELCOME_STEPS: readonly WelcomeStep[] = [
  { id: "scoring", icon: "TrophyIcon" },
  { id: "pools", icon: "UsersIcon" },
  { id: "wagers", icon: "CoinsIcon" },
  { id: "wallet", icon: "WalletIcon" },
  { id: "risk", icon: "ShieldAlertIcon" },
] as const;

export const WELCOME_STEP_COUNT = WELCOME_STEPS.length;
