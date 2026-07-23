## Why

The product is now **Winscore** (the app wordmark is the blue "W" tile + `INSCORE`, and `email-branding` already declares "blue Winscore branding"), but the magic-link **sign-in email** — often the very first branded surface a new user sees — still hardcodes the retired `WIN·SCORE·POOL` wordmark in its header. The sign-in link should carry the new branding so auth doesn't present a stale, off-brand identity.

## What Changes

- Replace the hardcoded three-segment `WIN·SCORE·POOL` wordmark in the magic-link email header (`renderHeader()` in `lib/notifications/magic-link-email-template.ts`) with an email-safe **Winscore** wordmark that mirrors the app `Logotype`: a "W" tile followed by `INSCORE`, rendered with the same table/inline-style/fixed-hex constraints (no `oklch`, CSS variables, or SVG `var()`).
- Keep the existing pitch-green header band, cream body, and mono uppercase labels — only the wordmark changes.
- Update the affected snapshot/assertion tests for the magic-link template.
- Correct the `magic-link-email` spec, which still describes an even older `WC·26·POOL` wordmark, to the Winscore wordmark.

Out of scope (flagged for a follow-up): the same stale `WIN·SCORE·POOL` wordmark also appears in ~12 sibling transactional email templates (result, welcome, recap-digest, winners, etc.). This change touches only the sign-in email.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `magic-link-email`: The "Branded, email-safe template matching the app" requirement changes the header wordmark from `WC·26·POOL` to the Winscore wordmark; all other branding constraints (email-safe HTML, CTA, plain-text, escaping, localization) are unchanged.

## Impact

- **Code**: `lib/notifications/magic-link-email-template.ts` (`renderHeader()` only).
- **Tests**: magic-link email template snapshot/HTML assertions under `tests/`.
- **Specs**: `openspec/specs/magic-link-email/spec.md` (wordmark reference).
- **Data / APIs / dependencies**: none.
- **Known broader gap**: sibling email templates still carry the old wordmark (out of scope here).
