---
name: "Commit (SemVer)"
description: Create a git commit with a Conventional Commits message that maps to Semantic Versioning
category: Git
tags: [git, commit, conventional-commits, semver]
---

Create a git commit whose message follows **Conventional Commits**, the convention that drives **Semantic Versioning**.

**Input**: Optional `$ARGUMENTS`:
- A free-text hint or scope (e.g. `/commit auth`, `/commit "flaky leaderboard test"`) — use it to guide the type/scope/subject, not as the literal message.
- `--release` (or `--bump`) — also bump the `version` field in `package.json` per the SemVer level implied by the change, and tag it (see step 6).
- `--push` — push after committing (only if the user typed this).
- `--amend` — amend the previous commit instead of creating a new one.

## Type → SemVer mapping

| Conventional type | When | SemVer bump |
|---|---|---|
| `feat` | new user-facing capability | MINOR |
| `fix` | bug fix | PATCH |
| `perf` | performance improvement | PATCH |
| `docs` / `style` / `refactor` / `test` / `build` / `ci` / `chore` | no runtime behavior change | none |
| any type with `!` or a `BREAKING CHANGE:` footer | incompatible change | MAJOR |

## Steps

1. **Gather context** (run these, read the output):
   - `!git status --short`
   - `!git diff --stat HEAD`
   - `!git diff HEAD` (staged + unstaged; if the diff is large, read the stat and the most relevant hunks)
   - `!git log --oneline -8` (match the repo's existing subject style)

2. **Decide what to stage.**
   - If files are already staged, commit exactly those (respect the user's intent).
   - If nothing is staged, stage the changes that belong to one logical unit. If the working tree mixes unrelated changes, commit only the coherent subset and say what you left out — do not sweep everything into one commit.
   - Never stage build artifacts, `node_modules`, `.env*`, or secrets. If any appear untracked, check `.gitignore` first and flag it rather than committing them.

3. **Pick the type and optional scope.** Read the actual diff — do not infer the type from the branch name or the user's hint alone. Scope is a short area token (`auth`, `deps`, `leaderboard`, `i18n`). Set the breaking flag (`type(scope)!:`) only when the change is genuinely incompatible.

4. **Write the message.**
   - Subject: `type(scope): summary` — imperative mood, lowercase after the colon, no trailing period, ≤ 72 chars.
   - Body (only when the "why" isn't obvious from the subject): wrap ~72 cols; explain the reason and any consequence, not a restatement of the diff.
   - Footers: `BREAKING CHANGE: <what broke and the migration>` when applicable; reference issues (`Refs #123`) if the user mentioned one.
   - End the message with:
     `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

5. **Create the commit** via `git commit -F -` (heredoc) so the multi-line message is preserved. Use `--amend` only if the user passed it.

6. **`--release` only:** compute the new version from the current `package.json` `version` and the SemVer level from step 3 (feat→minor, fix/perf→patch, breaking→major; skip if the level is "none" and tell the user why). Edit `package.json` `version`, stage it into the same commit, and create an annotated tag `vX.Y.Z`. Do not push the tag unless `--push` is also set.

7. **Push** only if `--push` was passed (`git push`, or `git push --follow-tags` when a tag was created). Otherwise stop after committing and report the new commit hash + message.

## Guardrails

- One logical change per commit — split unrelated work.
- The type must match the diff; if the change is mixed (e.g. a fix plus a refactor), lead with the most significant type and mention the rest in the body.
- Do not push, tag, or amend unless the corresponding flag/argument was given.
- Confirm before committing if the diff contains anything that looks like a credential, key, or `.env` value.
