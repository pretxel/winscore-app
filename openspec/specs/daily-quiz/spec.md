# daily-quiz Specification

## Purpose
TBD - created by archiving change add-daily-quiz. Update Purpose after archive.
## Requirements
### Requirement: One active question per day

The system SHALL expose at most one active quiz question per competition per UTC calendar day, identified by an `active_on` date that is unique per `(competition_id, active_on)`. The league-scoped quiz page (`/[league]/quiz`) SHALL show the question whose `competition_id` is the resolved league's competition and whose `active_on` equals the current UTC date, and SHALL render a friendly empty state when none exists for that competition today.

#### Scenario: Today's question is shown for the league
- **WHEN** a question exists with `active_on` equal to the current UTC date and `competition_id` equal to the resolved league's competition
- **THEN** the `/[league]/quiz` page renders that question's prompt and options

#### Scenario: No question today for this league
- **WHEN** no question has `active_on` equal to the current UTC date for the resolved league's competition
- **THEN** the page renders a "no question today" empty state instead of an error

#### Scenario: Each competition has its own day's question
- **WHEN** two competitions each have a question with `active_on` equal to today
- **THEN** each league's quiz page shows only its own competition's question

### Requirement: The correct answer is never sent before answering

The system SHALL NOT transmit a question's correct option to a client that has not yet answered it. Public reads of questions SHALL come from a view that omits the correct-answer column, and the correct option SHALL be disclosed only as the result of submitting an answer.

#### Scenario: Unanswered question hides the answer
- **WHEN** a signed-in or anonymous client loads today's question before answering
- **THEN** the response contains the prompt and options but not the correct option index

#### Scenario: Direct table read is blocked
- **WHEN** a non-admin client selects directly from the questions base table
- **THEN** RLS denies the read (only the answer-omitting public view is granted)

### Requirement: One-shot answering with server-side grading

The system SHALL let a signed-in user answer the active question exactly once. Grading SHALL happen server-side; the server SHALL compute correctness, persist the answer, and return whether it was correct along with the correct option. A second answer to the same question SHALL be rejected.

#### Scenario: First answer is graded
- **WHEN** a signed-in user submits a choice for today's question
- **THEN** the system stores the answer, computes correctness server-side, and returns `{ is_correct, correct_index }`

#### Scenario: Second answer rejected
- **WHEN** a user who already answered today's question submits again
- **THEN** the system rejects the submission and does not overwrite the original answer

#### Scenario: Anonymous cannot answer
- **WHEN** a signed-out visitor attempts to submit an answer
- **THEN** the submission is rejected and nothing is stored

### Requirement: Points and personal streak

The system SHALL award points for correct answers and SHALL show the signed-in user their current streak within the competition — the number of consecutive UTC days, ending today or yesterday, on which they answered a question for that competition.

#### Scenario: Correct answer earns points
- **WHEN** a user answers correctly
- **THEN** their quiz point total for that competition increases

#### Scenario: Streak reflects consecutive days within the competition
- **WHEN** a user has answered on each of the last N consecutive UTC days (ending today or yesterday) for a competition
- **THEN** that competition's quiz page shows a streak of N

#### Scenario: Streaks are independent per competition
- **WHEN** a user has different consecutive-day answer runs across two competitions
- **THEN** each league's quiz page shows the streak computed from that competition's answers only

### Requirement: Separate quiz leaderboard

The system SHALL provide a per-competition quiz leaderboard ranking players by total quiz points within that competition, then by earliest first answer. It SHALL be distinct from the prediction-pool leaderboard, which SHALL be unaffected.

#### Scenario: Ranking order within a competition
- **WHEN** a competition's quiz leaderboard is viewed
- **THEN** players are ordered by total quiz points for that competition descending, ties broken by earliest first answer

#### Scenario: Leaderboards are independent per competition
- **WHEN** a user earns quiz points in one competition
- **THEN** their rank on another competition's quiz leaderboard is unchanged

#### Scenario: Pool leaderboard unchanged
- **WHEN** a user earns quiz points
- **THEN** their position on the prediction-pool leaderboard does not change

### Requirement: Admin question authoring

The system SHALL let an admin create a quiz question with a competition, a prompt, options, the correct option, and an `active_on` date, plus optional Spanish, French, and German translations of the prompt and options. The `(competition_id, active_on)` pair SHALL be unique. A translation SHALL be accepted only when its prompt is non-blank and it provides exactly one non-blank option per English option (preserving order/index alignment); a fully blank translation block SHALL be ignored rather than rejected. Non-admins SHALL NOT be able to create or edit questions.

#### Scenario: Admin creates a question for a competition
- **WHEN** an admin submits a competition, prompt, options, correct option, and an `active_on` date
- **THEN** the question is stored and becomes the active question for that competition on that date

#### Scenario: Duplicate competition/day rejected
- **WHEN** an admin submits a question for a competition and `active_on` date that already has a question
- **THEN** the action is rejected and nothing is stored

#### Scenario: Admin adds translations
- **WHEN** an admin fills the Spanish, French, and/or German translation fields with a prompt and one option per English option
- **THEN** the translations are stored with the question and served to visitors in those locales

#### Scenario: Non-admin blocked
- **WHEN** a non-admin attempts to create or edit a question
- **THEN** the operation is denied by RLS

### Requirement: Quiz content is served in the request locale with English fallback

The `/quiz` page SHALL render the active question's prompt and options in the request locale (`es`, `fr`, `de`) when that locale's translation exists on the question, and in English otherwise. A translation SHALL be used only when its option count matches the English option count and all of its fields are non-blank; any malformed or partial translation SHALL fall back to English entirely (never a mixed-language question). Option order SHALL be identical across locales so the stored `correct_index` grades every locale the same way.

#### Scenario: Translated question in Spanish
- **WHEN** a visitor loads `/es/quiz` and today's question has a Spanish translation with the same number of options as the English original
- **THEN** the page renders the Spanish prompt and Spanish options
- **AND** answering by index grades identically to the English question

#### Scenario: Translated question in German
- **WHEN** a visitor loads `/de/quiz` and today's question has a German translation with the same number of options as the English original
- **THEN** the page renders the German prompt and German options
- **AND** answering by index grades identically to the English question

#### Scenario: Untranslated question falls back to English
- **WHEN** a visitor loads `/fr/quiz` and today's question has no French translation
- **THEN** the page renders the English prompt and options

#### Scenario: Malformed translation falls back entirely
- **WHEN** today's question has a Spanish translation whose option count differs from the English options (or contains a blank entry)
- **THEN** `/es/quiz` renders the full English prompt and options, with no mixed-language content

#### Scenario: Translations never leak the correct answer
- **WHEN** any client reads today's question through the public view
- **THEN** the response may contain prompt/option translations but still omits the correct option index

### Requirement: Every seeded quiz question ships translated

Every quiz question that ships with the product (the seeded set, and any row backfilled into an already-deployed database) SHALL carry complete Spanish (`es`), French (`fr`), and German (`de`) translations of its prompt and options. A shipped translation SHALL provide a non-blank prompt and exactly one non-blank option per English option, in the same order, so it is accepted by the existing translation validator and grades identically under the stored `correct_index`. The English columns remain canonical and unchanged; this requirement guarantees that a supported-locale visitor never falls back to English merely because translation content is absent.

This strengthens — but does not replace — the existing "Quiz content is served in the request locale with English fallback" requirement: fallback remains the defined behavior for any malformed or missing translation, but the shipped content SHALL not rely on it.

#### Scenario: Seeded question has Spanish, French, and German translations
- **WHEN** the seed data is loaded
- **THEN** every seeded question has an `es` translation, an `fr` translation, and a `de` translation
- **AND** each translation's option count equals the English option count
- **AND** each translation's prompt and every option are non-blank

#### Scenario: Translated options preserve order and index
- **WHEN** a seeded question's `es`, `fr`, or `de` translation is read
- **THEN** translated `options[i]` corresponds to English `options[i]` for every `i`
- **AND** answering by the stored `correct_index` is correct in every locale

#### Scenario: Existing database backfilled without reseed
- **WHEN** the German backfill migration runs against a database that already contains the seeded questions
- **THEN** each existing question (matched by `active_on`) gains its `de` translation alongside its existing `es` and `fr` translations
- **AND** re-running the migration leaves the data unchanged (idempotent)

#### Scenario: Supported-locale visitor sees translated content
- **WHEN** a visitor loads `/es/quiz`, `/fr/quiz`, or `/de/quiz` on a day with a seeded question
- **THEN** the prompt and options render in that locale, not English

