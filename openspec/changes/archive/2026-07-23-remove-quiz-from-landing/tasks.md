## 1. Remove Quiz card from FeatureSections

- [x] 1.1 Remove the `quizTitle`, `quizCopy`, `quizCta` entries from the `features` array in `app/[locale]/page.tsx`
- [x] 1.2 Remove the `BrainIcon` import from `app/[locale]/page.tsx`

## 2. Clean up i18n keys

- [x] 2.1 Remove `quizTitle`, `quizCopy`, `quizCta` from the `home` namespace in `messages/en.json`
- [x] 2.2 Remove `quizTitle`, `quizCopy`, `quizCta` from the `home` namespace in `messages/es.json`
- [x] 2.3 Remove `quizTitle`, `quizCopy`, `quizCta` from the `home` namespace in `messages/fr.json`
- [x] 2.4 Remove `quizTitle`, `quizCopy`, `quizCta` from the `home` namespace in `messages/de.json`

## 3. Verify

- [x] 3.1 Run `npm run build` or `npm run lint` to confirm no type/lint errors
- [x] 3.2 Visually confirm the landing page renders Groups and News cards correctly without Quiz
