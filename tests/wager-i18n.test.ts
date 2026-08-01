import { readFileSync } from "node:fs";
import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";

/**
 * The wager and wallet components shipped fully hardcoded in English while the
 * message bundles claimed key parity, so a locale check that only compares keys
 * would have passed. These tests check both halves: every key exists in every
 * locale AND every component actually resolves its strings through next-intl.
 */

const LOCALES = ["en", "es", "fr", "de"] as const;
const NAMESPACES = ["wager", "wallet", "wagerPayout", "wagerResults"] as const;

const COMPONENTS = [
  "components/wager/wager-rail.tsx",
  "components/wager/wager-payout.tsx",
  "components/wager/wager-results-table.tsx",
  "components/wallet/wallet-link-button.tsx",
];

function bundle(locale: string): Record<string, Record<string, string>> {
  return JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"));
}

/** Arguments for the interpolated messages, keyed by namespace. */
const ARGS: Record<string, Record<string, unknown>> = {
  wager: { stake: "1", token: "TKN" },
  wallet: {},
  wagerPayout: { amount: "1", token: "TKN" },
  wagerResults: {
    amount: "1",
    token: "TKN",
    hash: "abc123",
    count: 2,
    points: 5,
    exact: 1,
    gd: 2,
    winner: 3,
  },
};

describe("wager i18n bundles", () => {
  it("defines the same keys in every locale", () => {
    const en = bundle("en");
    for (const ns of NAMESPACES) {
      const expected = Object.keys(en[ns] ?? {}).sort();
      expect(expected.length, `en.${ns} is empty`).toBeGreaterThan(0);
      for (const locale of LOCALES.filter((l) => l !== "en")) {
        const actual = Object.keys(bundle(locale)[ns] ?? {}).sort();
        expect(actual, `${locale}.${ns} key mismatch`).toEqual(expected);
      }
    }
  });

  // A malformed ICU string throws when formatted, not when parsed, so a bad
  // placeholder would ship and only break the page that renders it.
  it("formats every message through next-intl without an error", () => {
    for (const locale of LOCALES) {
      const messages = bundle(locale);
      for (const ns of NAMESPACES) {
        const t = createTranslator({
          locale,
          messages: { [ns]: messages[ns] },
          namespace: ns,
          onError: (error) => {
            throw error;
          },
        });
        for (const key of Object.keys(messages[ns])) {
          const formatted = t(key as never, ARGS[ns] as never);
          expect(formatted, `${locale}.${ns}.${key} empty`).toBeTruthy();
          expect(formatted, `${locale}.${ns}.${key} left a placeholder`).not.toContain("{");
        }
      }
    }
  });
});

describe("wager components", () => {
  it("resolve their copy through next-intl rather than hardcoding it", () => {
    for (const path of COMPONENTS) {
      const src = readFileSync(path, "utf8");
      expect(src, `${path} does not use useTranslations`).toContain("useTranslations");
    }
  });

  // Guards the specific regression: user-facing sentences written inline in JSX.
  it("has no hardcoded English sentences left in JSX", () => {
    // Two capitalised-or-lowercase words in sequence, whether the copy sits in a
    // string literal ("Claim Award"), after a tag (>Connect Wallet), or alone on
    // its own JSX line, which is how prettier/biome wraps most button text.
    const sentence = /(?:^|[>"'{}\s])[A-Z][a-z]+ [A-Za-z]{2,}/;
    for (const path of COMPONENTS) {
      const offenders = readFileSync(path, "utf8")
        .split("\n")
        .map((line) => line.trim())
        // Comments document intent; they are never rendered. Covers line, block,
        // and JSX `{/* … */}` forms.
        .filter(
          (line) =>
            !line.startsWith("//") &&
            !line.startsWith("*") &&
            !line.startsWith("/*") &&
            !line.startsWith("{/*"),
        )
        .filter((line) => sentence.test(line))
        // className strings, imports, and type-only lines are not user-facing.
        .filter((line) => !/className|^import|^export|from ["']|^type |^interface /.test(line))
        // msg.includes("...") branches match on wallet-adapter error text.
        .filter((line) => !/\.includes\(/.test(line));
      expect(offenders, `${path} has hardcoded copy`).toEqual([]);
    }
  });
});
