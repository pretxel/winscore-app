## MODIFIED Requirements

### Requirement: Deterministic scoring rules
The system SHALL award points per prediction against a final match score using exactly these rules, and SHALL persist the result in the `scores` table with the matching `hit_type` value. The rules MUST live in one pure canonical SQL scoring primitive used by both `public.compute_match_scores` for mutable free predictions and wager aggregation for immutable snapshot predictions; neither caller may maintain an independent scoring formula.

- **5 points / `exact`**: both `home_goals` and `away_goals` equal the match's final scores.
- **3 points / `winner_gd`**: the prediction picks the correct winner (or correct draw) AND has the same goal difference (`home_goals - away_goals`) as the actual result, but does not match the exact scoreline.
- **1 point / `winner`**: the prediction picks the correct winner (or correct draw) but does not match goal difference.
- **0 points / `miss`**: none of the above.

The base points SHALL be multiplied by the stage `pointMultiplier` in `competitions.format_config.stages[]` when configured, with the existing canonical fallback for absent or unknown stages. The `hit_type` SHALL not change with the multiplier.

#### Scenario: Exact score
- **WHEN** a user predicted 2-1 and the final result is 2-1 in a stage with multiplier 1
- **THEN** the system records `points = 5` and `hit_type = 'exact'` in `scores` for that `(user_id, match_id)`.

#### Scenario: Correct winner and goal difference
- **WHEN** a user predicted 2-1 and the final result is 3-2 in a stage with multiplier 1
- **THEN** the system records `points = 3` and `hit_type = 'winner_gd'`.

#### Scenario: Correct draw with different score
- **WHEN** a user predicted 1-1 and the final result is 2-2 in a stage with multiplier 1
- **THEN** the system records `points = 3` and `hit_type = 'winner_gd'` (draw with matching goal difference of 0).

#### Scenario: Correct winner only
- **WHEN** a user predicted 2-0 and the final result is 3-1 in a stage with multiplier 1
- **THEN** the system records `points = 1` and `hit_type = 'winner'`.

#### Scenario: Wrong winner
- **WHEN** a user predicted 2-1 and the final result is 1-2
- **THEN** the system records `points = 0` and `hit_type = 'miss'`.

#### Scenario: Configured multiplier
- **WHEN** the canonical primitive scores an exact pick in a stage whose `pointMultiplier` is 4
- **THEN** it returns 20 points and `hit_type = 'exact'` for both free and wager callers

## ADDED Requirements

### Requirement: SQL and TypeScript scoring remain in contract parity
`lib/scoring.ts` SHALL mirror the canonical SQL base scoring and multiplier resolution. Automated contract tests MUST compare both implementations over generated valid predictions/results, supported and unknown stages, configured and fallback multipliers, draws, score bounds, and representative integer boundaries.

#### Scenario: Generated contract corpus
- **WHEN** the SQL and TypeScript scorers run the same generated case corpus
- **THEN** every case returns identical points and hit type

#### Scenario: Formula changes
- **WHEN** a scoring or multiplier rule is changed in one implementation without its counterpart
- **THEN** the contract suite fails before release

