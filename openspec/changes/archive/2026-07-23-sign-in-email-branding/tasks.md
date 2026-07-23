## 1. Rebrand the sign-in email header

- [x] 1.1 Rewrote `renderHeader()` in `lib/notifications/magic-link-email-template.ts` to emit the Winscore wordmark on the blue band: a cream "W" tile (cream bg `C.pitchFg`, blue `W` `C.pitch`) followed by `INSCORE` in cream, using the existing email-safe `<span>`/inline-style idiom (no `var()`/`oklch`/SVG).
- [x] 1.2 Updated the leading file comment and the `renderHeader` comment from `WIN·SCORE·POOL` to the Winscore wordmark.

## 2. Tests

- [x] 2.1 Replaced the `>WIN<` / `>SCORE<` / `>POOL<` assertions in `tests/magic-link-email-template.test.ts` with the Winscore signature (`>W<`, `>INSCORE<`, and a negative `>POOL<`); kept hex-color, CTA `href`, plain-text, and escaping assertions intact.
- [x] 2.2 `pnpm test tests/magic-link-email-template.test.ts` → 5 passed.

## 3. Verify

- [x] 3.1 `pnpm lint` clean; `pnpm typecheck` shows no errors for the touched file (pre-existing tsc errors elsewhere are unrelated).
- [x] 3.2 Rendered HTML no longer contains `>POOL<` (asserted negatively) and now contains the Winscore wordmark (`>W<`, `>INSCORE<`); the old `WIN`/`SCORE` segments were removed from `renderHeader()`.
