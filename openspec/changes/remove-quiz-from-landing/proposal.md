## Why

The landing page's FeatureSections grid currently promotes three core offerings: Groups, News, and Quiz. Quiz is a game mechanic that lives inside individual league pages — it isn't a top-level entry point for anonymous visitors. Removing it from the landing page simplifies the value proposition and avoids driving visitors to a redirect chain (`/quiz` → `/[league]/quiz`).

## What Changes

- **Remove** the Quiz card from the `FeatureSections` grid on the landing page (`app/[locale]/page.tsx`).
- **Remove** the `BrainIcon` import (lucide-react) from the landing page.
- **Remove** the quiz-specific translation keys (`quizTitle`, `quizCopy`, `quizCta`) from the `home` namespace in all locale message files.
- **Keep** the `FeatureSections` section itself, the Groups and News cards, and all shared translation keys (`featuresEyebrow`, `featuresHeadline`) unchanged.
- **No changes** to the quiz feature itself (league quiz pages, admin, share, reminders, etc.).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `landing-page`: Remove the quiz promotional card from the anonymous landing page feature grid. Requirements for the landing page layout are updated to exclude the quiz entry point.

## Impact

- **Code**: `app/[locale]/page.tsx` — remove quiz entry from `features` array and `BrainIcon` import
- **i18n**: `messages/{en,es,fr,de}.json` — remove `quizTitle`, `quizCopy`, `quizCta` keys from `home` namespace
- **No impact** on quiz feature, league pages, admin, API routes, cron jobs, or database
