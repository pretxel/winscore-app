import fs from "node:fs";
import path from "node:path";
import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "@/lib/i18n";

const MESSAGES_DIR = path.resolve(__dirname, "..", "messages");
const PANEL = path.resolve(
  __dirname,
  "..",
  "app/[locale]/(admin)/admin/wager/wager-admin-panel.tsx",
);
const PAGE = path.resolve(__dirname, "..", "app/[locale]/(admin)/admin/wager/page.tsx");

function wagerMessages(locale: string): Record<string, string> {
  const bundle = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf8"));
  return bundle.admin.wager;
}

/** Every `t("key")` the wager admin UI asks for. */
function usedKeys(): Set<string> {
  const source = fs.readFileSync(PANEL, "utf8") + fs.readFileSync(PAGE, "utf8");
  return new Set([...source.matchAll(/\bt\(\s*"([A-Za-z0-9_]+)"/g)].map((m) => m[1]));
}

describe("wager admin i18n", () => {
  // tests/i18n.test.ts already enforces key parity across locales. What it cannot
  // catch is the UI asking for a key nobody defined, which surfaces as a
  // MISSING_MESSAGE at render time — and the admin console is not covered by any
  // rendering test.
  it("defines every key the wager admin UI requests, in every locale", () => {
    const used = usedKeys();
    expect(used.size).toBeGreaterThan(0);

    for (const locale of SUPPORTED_LOCALES) {
      const defined = new Set(Object.keys(wagerMessages(locale)));
      const missing = [...used].filter((k) => !defined.has(k)).sort();
      expect(missing, `${locale} is missing wager admin keys`).toEqual([]);
    }
  });

  it("has no unused keys", () => {
    const used = usedKeys();
    const unused = Object.keys(wagerMessages("en"))
      .filter((k) => !used.has(k))
      .sort();
    expect(unused).toEqual([]);
  });

  // A malformed ICU string throws when formatted, not when the bundle is parsed,
  // so a bad placeholder would ship and only break the page it renders on. Format
  // through next-intl's own translator, which is what the components use.
  it("formats every message through next-intl without an error", () => {
    const args = { decimals: 6, number: 3, winners: 2 };

    for (const locale of SUPPORTED_LOCALES) {
      const messages = wagerMessages(locale);
      const t = createTranslator({
        locale,
        messages: { admin: { wager: messages } },
        namespace: "admin.wager",
        // Surface a formatting failure instead of letting next-intl swallow it
        // and fall back to returning the key.
        onError: (error) => {
          throw error;
        },
      });

      for (const key of Object.keys(messages)) {
        const formatted = t(key as never, args as never);
        expect(formatted, `${locale}.${key} formatted empty`).toBeTruthy();
        expect(formatted, `${locale}.${key} did not interpolate`).not.toContain("{");
      }
    }
  });

  it("keeps the interpolated messages' placeholders in every locale", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const messages = wagerMessages(locale);
      expect(messages.configureSuccess, `${locale}.configureSuccess`).toContain("{decimals}");
      expect(messages.roundOption, `${locale}.roundOption`).toContain("{number}");
      expect(messages.settleDone, `${locale}.settleDone`).toContain("{winners}");
    }
  });
});
