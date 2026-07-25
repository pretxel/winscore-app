#!/usr/bin/env bash
# Copy the Anchor-generated IDL into the committed location.
#
# `solana/winscore-wager/target/` is gitignored, so the generated IDL cannot be
# the one tests read — they would pass only on a machine that happens to have
# built the program. tests/wager-instructions.test.ts pins the hand-written
# instruction builders against the committed copy instead.
#
# Run this after `anchor build` whenever the program's instructions change, and
# commit the result.
set -euo pipefail

cd "$(dirname "$0")/.."

GENERATED="solana/winscore-wager/target/idl/winscore_wager.json"
COMMITTED="solana/winscore-wager/idl/winscore_wager.json"

if [[ ! -f "$GENERATED" ]]; then
  echo "error: $GENERATED not found — run 'anchor build' in solana/winscore-wager first" >&2
  exit 1
fi

mkdir -p "$(dirname "$COMMITTED")"

if [[ -f "$COMMITTED" ]] && cmp -s "$GENERATED" "$COMMITTED"; then
  echo "IDL already up to date."
  exit 0
fi

cp "$GENERATED" "$COMMITTED"
echo "Updated $COMMITTED — commit it, then re-run 'pnpm test' to confirm the"
echo "instruction builders still match the program."
