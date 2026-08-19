import { readFileSync } from "node:fs";
import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";

/**
 * The how-it-works page is the public rulebook, so a key that exists in English
 * but not in another locale silently shows an untranslated string — or the raw
 * key — to a player reading the rules they are being held to.
 */

const LOCALES = ["en", "es", "fr", "de"] as const;

function howItWorks(locale: string): Record<string, string> {
  return JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).howItWorks;
}

describe("how-it-works copy", () => {
  it("defines the same keys in every locale", () => {
    const expected = Object.keys(howItWorks("en")).sort();
    for (const locale of LOCALES.filter((l) => l !== "en")) {
      expect(Object.keys(howItWorks(locale)).sort(), `${locale} key mismatch`).toEqual(expected);
    }
  });

  it("formats every message through next-intl without an error", () => {
    for (const locale of LOCALES) {
      const messages = howItWorks(locale);
      const t = createTranslator({
        locale,
        messages: { howItWorks: messages },
        namespace: "howItWorks",
        onError: (error) => {
          throw error;
        },
      });
      for (const key of Object.keys(messages)) {
        const formatted = t(key as never);
        expect(formatted, `${locale}.${key} empty`).toBeTruthy();
        expect(formatted, `${locale}.${key} left a placeholder`).not.toContain("{");
      }
    }
  });

  // The page renders these by name, so a missing one is a blank section rather
  // than a build error.
  it("defines every key the wager section renders", () => {
    const required = [
      "section5Title",
      "section5P1",
      "section5P2",
      "section5Item1",
      "section5Item2",
      "section5Item3",
      "section5RiskTitle",
      "section5Risk1",
      "section5Risk2",
      "section5Risk3",
      "section5Risk4",
    ];
    for (const locale of LOCALES) {
      const messages = howItWorks(locale);
      const missing = required.filter((k) => !messages[k]);
      expect(missing, `${locale} is missing wager section keys`).toEqual([]);
    }
  });

  // Wagering is devnet-only. Copy that implies real money would be a
  // misrepresentation, and the devnet caveat is what makes that explicit.
  it("states the devnet caveat in every locale", () => {
    for (const locale of LOCALES) {
      expect(howItWorks(locale).section5Risk1, `${locale}.section5Risk1`).toMatch(/devnet/i);
    }
  });

  // The app runs several competitions at once, so rules copy naming one of them
  // is wrong for everybody else reading it. This originally said "every World
  // Cup 2026 match" long after Liga MX and La Liga went live.
  it("keeps the rules competition-agnostic", () => {
    const named = /world cup|mundial|coupe du monde|tournament|torneo|tournoi|turnier/i;
    for (const locale of LOCALES) {
      const offenders = Object.entries(howItWorks(locale))
        .filter(([, value]) => named.test(value))
        .map(([key]) => key);
      expect(offenders, `${locale} names a specific competition`).toEqual([]);
    }
  });
});
