## Context

The landing page's `FeatureSections` component renders a 3-column grid of promotional cards for Groups, News, and Quiz. Quiz is not a top-level entry point — it's a per-league game mechanic reached via `/[league]/quiz`. Removing it from the landing page simplifies the anonymous visitor experience and eliminates a redirect chain.

## Goals / Non-Goals

**Goals:**
- Remove the Quiz card from the anonymous landing page feature grid
- Clean up the unused `BrainIcon` import and quiz i18n keys from the `home` namespace
- Preserve the layout, style, and content of the Groups and News cards

**Non-Goals:**
- No changes to any Quiz page, component, API, or database entity
- No restructuring of the `FeatureSections` layout (remains a 2-column or 3-column grid — Tailwind's `sm:grid-cols-3` will naturally leave empty space, or we let it be)

## Decisions

1. **Keep `sm:grid-cols-3` unchanged** — The grid class stays; removing one item just leaves the third column empty. Simpler than changing the grid to `sm:grid-cols-2` and adjusting widths, which would look unbalanced. Since the empty column is invisible (no border/background on the grid container, only on list items), the remaining two cards will be left-aligned with empty space on the right — acceptable and minimal.

   Alternative considered: Changing to `sm:grid-cols-2` and making cards span full half-width. Rejected because it would require retesting responsive behavior across breakpoints with no clear UX benefit.

2. **Remove i18n keys entirely vs. keep for future** — The keys `quizTitle`, `quizCopy`, `quizCta` in the `home` namespace are only used in this one location. Removing them avoids dead translation baggage. The Quiz feature itself has its own i18n keys in its own namespace (outside `home`), which are untouched.

## Risks / Trade-offs

- **Translation drift**: If someone adds the Quiz card back later, the i18n keys will need re-translation. Low risk — the keys were simple and reproducible.
- **Grid gap on tablet**: On 2-column breakpoints (`sm:grid-cols-3`), removing one item from a 3-column layout on a 2-column grid breakpoint won't cause issues. On the `sm:grid-cols-3` breakpoint itself, the third grid cell will be empty — invisible to users.
