# Admin Wager Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Winscore admin enable wagering for a pool round end-to-end (DB config + DB round row + on-chain PDA/vault) from the global admin UI, no SQL or CLI.

**Architecture:** A migration relaxes two config RPCs to allow admins. Pure, tested helpers parse the mint account, compute base units, load the authority keypair, and build the on-chain init instruction (shared with the CLI script). Three thin admin API routes call these helpers + RPCs. One admin page drives them.

**Tech Stack:** Next.js (App Router, server components + route handlers), Supabase (Postgres RPC + RLS), `@solana/kit`, `@solana-program/token`, vitest, biome.

## Global Constraints

- Devnet only. `cluster` must be `'devnet'`; env `WAGER_CLUSTER` any other value fails closed.
- Target is ES2017: **no BigInt literals** (`0n`), use `BigInt(0)`. bigint via `BigInt(...)` calls is fine.
- Supabase `.select()` strings with embedded resources must be a **single string literal** (no `+` concatenation) or type inference breaks.
- `bytea` columns are read/written as `\x<hex>` strings.
- Program version seed byte is `1` (`PROGRAM_VERSION` in `lib/wager/pda.ts`).
- On-chain init fixed params (mirror `scripts/init-wager-round.ts`): `refundTimeout = BigInt(172_800)` (48h), `maxParticipants = 1000`, `maxTotalStake = BigInt(1_000_000_000_000)`, `rentRecipientA = rentRecipientB = authority`.
- Classic SPL Token program: `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`. Token-2022: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`.
- Secrets (`WAGER_AUTHORITY_KEYPAIR`) are server-only; never import into client components.
- Run `npm test`, `npx biome check --write <files>`, and `npm run build` before each commit; the pre-commit hook runs the full test suite.
- Commit message trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

---

## File Structure

- `supabase/migrations/20260724000000_wager_admin_config_access.sql` — relax both RPC owner checks to `is_group_owner OR is_admin()`.
- `lib/wager/mint-account.ts` — `parseMintAccount`, `stakeToBaseUnits`, token program constants.
- `lib/wager/init-round.ts` — `buildInitRoundInstruction` (shared by route + script).
- `lib/wager/authority.ts` — `parseKeypairSecret`, `loadWagerAuthoritySigner`.
- `scripts/init-wager-round.ts` — refactor to use `buildInitRoundInstruction`.
- `app/api/admin/wager/_admin.ts` — `assertAdmin` helper (session + `profiles.is_admin`).
- `app/api/admin/wager/configure/route.ts`
- `app/api/admin/wager/initialize/route.ts`
- `app/api/admin/wager/status/route.ts`
- `app/[locale]/(admin)/admin/wager/page.tsx` — server page, loads groups+rounds.
- `app/[locale]/(admin)/admin/wager/wager-admin-panel.tsx` — client panel.
- `components/admin/admin-shell.tsx` — add nav link (modify).
- Tests: `tests/wager-mint-account.test.ts`, `tests/wager-init-round.test.ts`, `tests/wager-authority.test.ts`, `tests/wager-admin-sql.test.ts`.

---

## Task 1: Migration — allow admins to configure/initialize

**Files:**
- Create: `supabase/migrations/20260724000000_wager_admin_config_access.sql`
- Test: `tests/wager-admin-sql.test.ts`

**Interfaces:**
- Produces: relaxed `configure_pool_wager(...)` and `initialize_wager_round(uuid,uuid)` — guard becomes `is_group_owner(g) OR is_admin()`.

- [ ] **Step 1: Write failing test** — assert the migration text contains the relaxed guard for both functions.

```ts
// tests/wager-admin-sql.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20260724000000_wager_admin_config_access.sql",
  "utf8",
);

describe("wager admin config migration", () => {
  it("relaxes configure_pool_wager to allow admins", () => {
    expect(sql).toContain("create or replace function public.configure_pool_wager");
    expect(sql).toMatch(/is_group_owner\(p_group_id\)\s+or\s+public\.is_admin\(\)/);
  });
  it("relaxes initialize_wager_round to allow admins", () => {
    expect(sql).toContain("create or replace function public.initialize_wager_round");
  });
  it("keeps both guards raising when neither owner nor admin", () => {
    expect((sql.match(/raise exception/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run test, verify fails** — `npx vitest run tests/wager-admin-sql.test.ts` → FAIL (file missing).
- [ ] **Step 3: Write the migration** — copy both function bodies verbatim from `20260722211859_wager_config_functions.sql`, changing only the guard.

```sql
-- Allow global admins (not just pool owners) to configure and initialize
-- wager rounds, so the admin console can enable wagering for any pool.
-- Rollback: restore the is_group_owner-only guards from 20260722211859.

create or replace function public.configure_pool_wager(
  p_group_id uuid,
  p_approved_mint bytea,
  p_approved_token_program bytea,
  p_verified_decimals smallint,
  p_stake_base_units numeric,
  p_cluster text default 'devnet',
  p_limits jsonb default '{}'::jsonb
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_config_id uuid;
begin
  if not (public.is_group_owner(p_group_id) or public.is_admin()) then
    raise exception 'Only the pool owner or an admin can configure wagering';
  end if;

  if length(p_approved_mint) <> 32 then
    raise exception 'approved_mint must be 32 bytes';
  end if;
  if length(p_approved_token_program) <> 32 then
    raise exception 'approved_token_program must be 32 bytes';
  end if;
  if p_verified_decimals < 0 or p_verified_decimals > 9 then
    raise exception 'verified_decimals must be 0-9';
  end if;
  if p_stake_base_units <= 0 then
    raise exception 'stake_base_units must be positive';
  end if;
  if p_cluster <> 'devnet' then
    raise exception 'Only devnet cluster is allowed';
  end if;

  insert into public.group_wager_configs (
    group_id, enabled, approved_mint, approved_token_program,
    verified_decimals, stake_base_units, cluster, limits
  ) values (
    p_group_id, true, p_approved_mint, p_approved_token_program,
    p_verified_decimals, p_stake_base_units, p_cluster, p_limits
  )
  on conflict (group_id) do update set
    enabled = true,
    approved_mint = excluded.approved_mint,
    approved_token_program = excluded.approved_token_program,
    verified_decimals = excluded.verified_decimals,
    stake_base_units = excluded.stake_base_units,
    cluster = excluded.cluster,
    limits = excluded.limits
  returning id into v_config_id;

  return v_config_id;
end;
$$;

create or replace function public.initialize_wager_round(
  p_group_id uuid,
  p_round_id uuid
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_config record;
  v_close timestamptz;
  v_wager_round_id uuid;
begin
  if not (public.is_group_owner(p_group_id) or public.is_admin()) then
    raise exception 'Only the pool owner or an admin can initialize wager rounds';
  end if;

  select * into v_config
  from public.group_wager_configs
  where group_id = p_group_id and enabled = true;

  if not found then
    raise exception 'Wagering is not configured or disabled for this pool';
  end if;

  if not public.round_can_accept_wager(p_round_id) then
    raise exception 'Round has no eligible fixtures';
  end if;

  v_close := public.round_effective_close(p_round_id);
  if v_close <= now() then
    raise exception 'Round has already closed';
  end if;

  insert into public.wager_rounds (
    wager_config_id, group_id, round_id,
    stake_base_units, approved_mint, approved_token_program,
    verified_decimals, closes_at, cluster, program_version
  ) values (
    v_config.id, p_group_id, p_round_id,
    v_config.stake_base_units, v_config.approved_mint,
    v_config.approved_token_program, v_config.verified_decimals,
    v_close, v_config.cluster, 1
  )
  on conflict (group_id, round_id) do nothing
  returning id into v_wager_round_id;

  return v_wager_round_id;
end;
$$;
```

- [ ] **Step 4: Run test, verify passes** — `npx vitest run tests/wager-admin-sql.test.ts` → PASS.
- [ ] **Step 5: Apply to remote DB** — run via the Supabase MCP `apply_migration` (project `pabzhdozyoepvjeqxega`, name `wager_admin_config_access`) using the two `create or replace` statements. Then confirm no error.
- [ ] **Step 6: Commit** — `git add supabase/migrations/20260724000000_wager_admin_config_access.sql tests/wager-admin-sql.test.ts && git commit`.

---

## Task 2: Mint account parsing + base units

**Files:**
- Create: `lib/wager/mint-account.ts`
- Test: `tests/wager-mint-account.test.ts`

**Interfaces:**
- Produces:
  - `TOKEN_2022_PROGRAM_ADDRESS: string`
  - `parseMintAccount(owner: string, data: Uint8Array): { decimals: number; tokenProgram: string }` — throws `Error` if `owner` is neither token program, `data.length < 82`, or the mint is not initialized (`data[45] !== 1`). `decimals = data[44]`, `tokenProgram = owner`.
  - `stakeToBaseUnits(amount: string, decimals: number): bigint` — parses a non-negative decimal string; rejects more fractional digits than `decimals`; returns `amount * 10^decimals`. Throws on invalid/zero.
- Consumes: `TOKEN_PROGRAM_ADDRESS` from `@/lib/wager/instructions`.

- [ ] **Step 1: Write failing tests**

```ts
// tests/wager-mint-account.test.ts
import { describe, expect, it } from "vitest";
import {
  parseMintAccount,
  stakeToBaseUnits,
  TOKEN_2022_PROGRAM_ADDRESS,
} from "@/lib/wager/mint-account";
import { TOKEN_PROGRAM_ADDRESS } from "@/lib/wager/instructions";

function mintData(decimals: number, initialized = 1): Uint8Array {
  const d = new Uint8Array(82);
  d[44] = decimals;
  d[45] = initialized;
  return d;
}

describe("parseMintAccount", () => {
  it("reads decimals and token program from a classic mint", () => {
    const r = parseMintAccount(TOKEN_PROGRAM_ADDRESS, mintData(6));
    expect(r).toEqual({ decimals: 6, tokenProgram: TOKEN_PROGRAM_ADDRESS });
  });
  it("accepts a Token-2022 mint", () => {
    const r = parseMintAccount(TOKEN_2022_PROGRAM_ADDRESS, mintData(9));
    expect(r.tokenProgram).toBe(TOKEN_2022_PROGRAM_ADDRESS);
  });
  it("rejects a non-token-program owner", () => {
    expect(() => parseMintAccount("11111111111111111111111111111111", mintData(6))).toThrow();
  });
  it("rejects an account that is too short", () => {
    expect(() => parseMintAccount(TOKEN_PROGRAM_ADDRESS, new Uint8Array(10))).toThrow();
  });
  it("rejects an uninitialized mint", () => {
    expect(() => parseMintAccount(TOKEN_PROGRAM_ADDRESS, mintData(6, 0))).toThrow();
  });
});

describe("stakeToBaseUnits", () => {
  it("scales a whole number", () => {
    expect(stakeToBaseUnits("1", 6)).toBe(BigInt(1_000_000));
  });
  it("scales a fractional amount", () => {
    expect(stakeToBaseUnits("1.5", 6)).toBe(BigInt(1_500_000));
  });
  it("rejects more fraction digits than decimals", () => {
    expect(() => stakeToBaseUnits("1.1234567", 6)).toThrow();
  });
  it("rejects zero and negatives and junk", () => {
    expect(() => stakeToBaseUnits("0", 6)).toThrow();
    expect(() => stakeToBaseUnits("-1", 6)).toThrow();
    expect(() => stakeToBaseUnits("abc", 6)).toThrow();
  });
});
```

- [ ] **Step 2: Run tests, verify fail** — `npx vitest run tests/wager-mint-account.test.ts` → FAIL.
- [ ] **Step 3: Implement**

```ts
// lib/wager/mint-account.ts
import { TOKEN_PROGRAM_ADDRESS } from "@/lib/wager/instructions";

export const TOKEN_2022_PROGRAM_ADDRESS =
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

const MINT_MIN_SIZE = 82;
const DECIMALS_OFFSET = 44;
const INITIALIZED_OFFSET = 45;

/** Read decimals + token program from a raw SPL mint account. Throws if invalid. */
export function parseMintAccount(
  owner: string,
  data: Uint8Array,
): { decimals: number; tokenProgram: string } {
  if (owner !== TOKEN_PROGRAM_ADDRESS && owner !== TOKEN_2022_PROGRAM_ADDRESS) {
    throw new Error("Address is not owned by a token program (not a mint)");
  }
  if (data.length < MINT_MIN_SIZE) {
    throw new Error("Account is too small to be a mint");
  }
  if (data[INITIALIZED_OFFSET] !== 1) {
    throw new Error("Mint is not initialized");
  }
  return { decimals: data[DECIMALS_OFFSET], tokenProgram: owner };
}

/** Convert a human token amount to base units for the given decimals. Throws on invalid input. */
export function stakeToBaseUnits(amount: string, decimals: number): bigint {
  if (!/^\d+(\.\d+)?$/.test(amount)) {
    throw new Error("Stake must be a non-negative decimal number");
  }
  const [whole, fraction = ""] = amount.split(".");
  if (fraction.length > decimals) {
    throw new Error(`Stake has more than ${decimals} fractional digits`);
  }
  const padded = fraction.padEnd(decimals, "0");
  const base = BigInt(whole + padded);
  if (base <= BigInt(0)) {
    throw new Error("Stake must be positive");
  }
  return base;
}
```

- [ ] **Step 4: Run tests, verify pass** — `npx vitest run tests/wager-mint-account.test.ts` → PASS.
- [ ] **Step 5: Commit** — `git add lib/wager/mint-account.ts tests/wager-mint-account.test.ts && git commit`.

---

## Task 3: Shared on-chain init instruction builder

**Files:**
- Create: `lib/wager/init-round.ts`
- Test: `tests/wager-init-round.test.ts`

**Interfaces:**
- Produces:
  - `buildInitRoundInstruction(params: { groupId: string; roundId: string; mint: string; tokenProgram: string; authority: string; settlementAuthority: string; closesAt: bigint }): Promise<{ instruction: Instruction; wagerRound: string; vault: string }>`
  - Uses env `programId` via `deriveWagerRoundPda` / `deriveVaultAta`, and `buildInitializeWagerRoundInstruction` with the Global Constraints fixed params.
- Consumes: `deriveWagerRoundPda`, `deriveVaultAta` from `@/lib/wager/pda`; `buildInitializeWagerRoundInstruction` from `@/lib/wager/instructions`; `getWagerEnv` from `@/lib/wager/env`.

- [ ] **Step 1: Write failing test** — assert derived addresses and encoded args (discriminator + closesAt). Use the same PROGRAM env default as `wager-instructions.test.ts`.

```ts
// tests/wager-init-round.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/wager/env", () => ({
  getWagerEnv: () => ({
    programId: "9q5fBczvg3XYipRmxY5tt3axGgNQfYtGeaDpbMHMLkmi",
    tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  }),
}));

const GROUP = "11111111-1111-1111-1111-111111111111";
const ROUND = "22222222-2222-2222-2222-222222222222";
const MINT = "So11111111111111111111111111111111111111112";
const AUTH = "5WReDH2phKadrF1f6jzx7ddscKZVbtoZsNgZ2Egt1NuB";
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

describe("buildInitRoundInstruction", () => {
  it("derives wagerRound + vault and targets the program", async () => {
    const { buildInitRoundInstruction } = await import("@/lib/wager/init-round");
    const { INITIALIZE_WAGER_ROUND_DISCRIMINATOR } = await import("@/lib/wager/instructions");
    const r = await buildInitRoundInstruction({
      groupId: GROUP,
      roundId: ROUND,
      mint: MINT,
      tokenProgram: TOKEN_PROGRAM,
      authority: AUTH,
      settlementAuthority: AUTH,
      closesAt: BigInt(1_800_000_000),
    });
    expect(r.wagerRound).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    expect(r.vault).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    expect(r.instruction.programAddress).toBe("9q5fBczvg3XYipRmxY5tt3axGgNQfYtGeaDpbMHMLkmi");
    expect([...(r.instruction.data as Uint8Array).slice(0, 8)]).toEqual([
      ...INITIALIZE_WAGER_ROUND_DISCRIMINATOR,
    ]);
  });
});
```

- [ ] **Step 2: Run test, verify fails** — `npx vitest run tests/wager-init-round.test.ts` → FAIL.
- [ ] **Step 3: Implement**

```ts
// lib/wager/init-round.ts
import { type Address, type Instruction } from "@solana/kit";
import { buildInitializeWagerRoundInstruction } from "@/lib/wager/instructions";
import { deriveVaultAta, deriveWagerRoundPda } from "@/lib/wager/pda";

const REFUND_TIMEOUT_SECONDS = BigInt(172_800); // 48h
const MAX_PARTICIPANTS = 1000;
const MAX_TOTAL_STAKE = BigInt(1_000_000_000_000);

function uuidToBytes(uuid: string): Uint8Array {
  return Uint8Array.from(Buffer.from(uuid.replace(/-/g, ""), "hex"));
}

export interface InitRoundParams {
  groupId: string;
  roundId: string;
  mint: string;
  tokenProgram: string;
  authority: string;
  settlementAuthority: string;
  closesAt: bigint;
}

/** Build the on-chain initialize_wager_round instruction + derived accounts. */
export async function buildInitRoundInstruction(
  params: InitRoundParams,
): Promise<{ instruction: Instruction; wagerRound: string; vault: string }> {
  const mint = params.mint as Address;
  const tokenProgram = params.tokenProgram as Address;
  const authority = params.authority as Address;

  const wagerRound = await deriveWagerRoundPda(params.groupId, params.roundId);
  const vault = await deriveVaultAta(wagerRound.address, mint, tokenProgram);

  const instruction = buildInitializeWagerRoundInstruction(
    wagerRound.address /* placeholder to satisfy type; replaced below */ as never,
    {
      authority,
      wagerRound: wagerRound.address,
      approvedMint: mint,
      vault: vault.address,
      rentRecipientA: authority,
      rentRecipientB: authority,
      tokenProgram,
    },
    {
      groupId: uuidToBytes(params.groupId),
      roundId: uuidToBytes(params.roundId),
      closesAt: params.closesAt,
      refundTimeout: REFUND_TIMEOUT_SECONDS,
      maxParticipants: MAX_PARTICIPANTS,
      maxTotalStake: MAX_TOTAL_STAKE,
      settlementAuthority: params.settlementAuthority as Address,
    },
  );

  return { instruction, wagerRound: wagerRound.address, vault: vault.address };
}
```

  NOTE for implementer: the first arg of `buildInitializeWagerRoundInstruction` is the **program id**, not the wagerRound. Read it from `getWagerEnv().programId` and pass `getWagerEnv().programId as Address`. The placeholder comment above is intentionally wrong so you replace it — import `getWagerEnv` from `@/lib/wager/env` and use `getWagerEnv().programId as Address`.

- [ ] **Step 4: Run test, verify passes** — `npx vitest run tests/wager-init-round.test.ts` → PASS.
- [ ] **Step 5: Refactor the CLI script to use the helper** — in `scripts/init-wager-round.ts`, replace the inline PDA/vault derivation and `buildInitializeWagerRoundInstruction` call with `buildInitRoundInstruction({...})`, keeping keypair loading, blockhash, sign, send. Verify it still type-checks (`npx tsc --noEmit`).
- [ ] **Step 6: Run tests + build** — `npm test`, `npm run build`.
- [ ] **Step 7: Commit** — `git add lib/wager/init-round.ts tests/wager-init-round.test.ts scripts/init-wager-round.ts && git commit`.

---

## Task 4: Authority keypair loader

**Files:**
- Create: `lib/wager/authority.ts`
- Test: `tests/wager-authority.test.ts`

**Interfaces:**
- Produces:
  - `parseKeypairSecret(raw: string): Uint8Array` — accepts a JSON array of 64 bytes; throws on malformed/wrong length.
  - `loadWagerAuthoritySigner(): Promise<KeyPairSigner>` — reads `process.env.WAGER_AUTHORITY_KEYPAIR`, calls `parseKeypairSecret`, then `createKeyPairSignerFromBytes`. Throws a clear error if the env var is missing.
- Consumes: `createKeyPairSignerFromBytes` from `@solana/kit`.

- [ ] **Step 1: Write failing tests**

```ts
// tests/wager-authority.test.ts
import { describe, expect, it } from "vitest";
import { parseKeypairSecret } from "@/lib/wager/authority";

describe("parseKeypairSecret", () => {
  it("parses a 64-byte JSON array", () => {
    const arr = Array.from({ length: 64 }, (_, i) => i % 256);
    const bytes = parseKeypairSecret(JSON.stringify(arr));
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(64);
  });
  it("rejects a wrong-length array", () => {
    expect(() => parseKeypairSecret(JSON.stringify([1, 2, 3]))).toThrow();
  });
  it("rejects non-JSON", () => {
    expect(() => parseKeypairSecret("not json")).toThrow();
  });
});
```

- [ ] **Step 2: Run tests, verify fail** — `npx vitest run tests/wager-authority.test.ts` → FAIL.
- [ ] **Step 3: Implement**

```ts
// lib/wager/authority.ts
import { createKeyPairSignerFromBytes, type KeyPairSigner } from "@solana/kit";

/** Parse a Solana CLI keypair (JSON array of 64 bytes) into raw bytes. Throws on invalid input. */
export function parseKeypairSecret(raw: string): Uint8Array {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("WAGER_AUTHORITY_KEYPAIR is not valid JSON");
  }
  if (!Array.isArray(parsed) || parsed.length !== 64) {
    throw new Error("WAGER_AUTHORITY_KEYPAIR must be a JSON array of 64 bytes");
  }
  return Uint8Array.from(parsed as number[]);
}

/** Load the server-side wager authority signer from the environment. */
export async function loadWagerAuthoritySigner(): Promise<KeyPairSigner> {
  const raw = process.env.WAGER_AUTHORITY_KEYPAIR;
  if (!raw) {
    throw new Error("WAGER_AUTHORITY_KEYPAIR is not set");
  }
  return createKeyPairSignerFromBytes(parseKeypairSecret(raw));
}
```

- [ ] **Step 4: Run tests, verify pass** — `npx vitest run tests/wager-authority.test.ts` → PASS.
- [ ] **Step 5: Commit** — `git add lib/wager/authority.ts tests/wager-authority.test.ts && git commit`.

---

## Task 5: Admin guard helper

**Files:**
- Create: `app/api/admin/wager/_admin.ts`

**Interfaces:**
- Produces: `assertAdmin(): Promise<{ ok: true; supabase: SupabaseClient; userId: string } | { ok: false; response: NextResponse }>` — resolves the session, checks `profiles.is_admin`; on failure returns a ready 401/403 `NextResponse`.
- Consumes: `createServerSupabaseClient` from `@/lib/supabase/server`.

- [ ] **Step 1: Implement** (no separate unit test — exercised by route tasks; logic mirrors `app/[locale]/(admin)/admin/quiz/actions.ts`).

```ts
// app/api/admin/wager/_admin.ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function assertAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return { ok: false as const, response: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  }
  return { ok: true as const, supabase, userId: user.id };
}
```

- [ ] **Step 2: Commit** — `git add app/api/admin/wager/_admin.ts && git commit`.

---

## Task 6: Configure route

**Files:**
- Create: `app/api/admin/wager/configure/route.ts`

**Interfaces:**
- Consumes: `assertAdmin`, `parseMintAccount`, `stakeToBaseUnits`, `getWagerEnv`, `@solana/kit` (`createSolanaRpc`, `getBase58Encoder`... use base64 account fetch + `Buffer`).
- Produces: `POST` accepting `{ groupId: string; mint: string; stakeAmount: string }`, returns `{ ok, configId }` or an error status.

- [ ] **Step 1: Implement**

```ts
// app/api/admin/wager/configure/route.ts
import { address, createSolanaRpc } from "@solana/kit";
import { base58 } from "@scure/base";
import { NextResponse } from "next/server";
import { assertAdmin } from "@/app/api/admin/wager/_admin";
import { getWagerEnv } from "@/lib/wager/env";
import { parseMintAccount, stakeToBaseUnits } from "@/lib/wager/mint-account";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await assertAdmin();
  if (!auth.ok) return auth.response;

  let body: { groupId?: string; mint?: string; stakeAmount?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { groupId, mint, stakeAmount } = body;
  if (!groupId || !mint || !stakeAmount) {
    return NextResponse.json({ error: "groupId, mint and stakeAmount are required" }, { status: 400 });
  }

  const env = getWagerEnv();
  const rpc = createSolanaRpc(env.rpcUrl);

  let decimals: number;
  let tokenProgram: string;
  try {
    const info = await rpc.getAccountInfo(address(mint), { encoding: "base64" }).send();
    if (!info.value) return NextResponse.json({ error: "Mint account not found on devnet" }, { status: 400 });
    const data = new Uint8Array(Buffer.from(info.value.data[0], "base64"));
    ({ decimals, tokenProgram } = parseMintAccount(info.value.owner, data));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to read mint" }, { status: 400 });
  }

  let stakeBaseUnits: bigint;
  try {
    stakeBaseUnits = stakeToBaseUnits(stakeAmount, decimals);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid stake" }, { status: 400 });
  }

  const mintHex = `\\x${Buffer.from(base58.decode(mint)).toString("hex")}`;
  const tokenProgramHex = `\\x${Buffer.from(base58.decode(tokenProgram)).toString("hex")}`;

  const { data, error } = await auth.supabase.rpc("configure_pool_wager", {
    p_group_id: groupId,
    p_approved_mint: mintHex,
    p_approved_token_program: tokenProgramHex,
    p_verified_decimals: decimals,
    p_stake_base_units: stakeBaseUnits.toString(),
    p_cluster: "devnet",
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, configId: data, decimals, tokenProgram }, { headers: { "Cache-Control": "no-store" } });
}
```

- [ ] **Step 2: Typecheck + build** — `npx tsc --noEmit` then `npm run build`; fix any type errors (esp. `getAccountInfo` data typing).
- [ ] **Step 3: Commit** — `git add app/api/admin/wager/configure/route.ts && git commit`.

---

## Task 7: Initialize route (DB + on-chain)

**Files:**
- Create: `app/api/admin/wager/initialize/route.ts`

**Interfaces:**
- Consumes: `assertAdmin`, `buildInitRoundInstruction`, `loadWagerAuthoritySigner`, `getWagerEnv`, `createAdminSupabaseClient`, `@solana/kit` tx builders.
- Produces: `POST` accepting `{ groupId, roundId }`, returns `{ ok, wagerRound, vault, signature, alreadyInitialized }`.

- [ ] **Step 1: Implement**

```ts
// app/api/admin/wager/initialize/route.ts
import {
  address,
  appendTransactionMessageInstructions,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import { NextResponse } from "next/server";
import { assertAdmin } from "@/app/api/admin/wager/_admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { loadWagerAuthoritySigner } from "@/lib/wager/authority";
import { getWagerEnv } from "@/lib/wager/env";
import { buildInitRoundInstruction } from "@/lib/wager/init-round";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await assertAdmin();
  if (!auth.ok) return auth.response;

  let body: { groupId?: string; roundId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { groupId, roundId } = body;
  if (!groupId || !roundId) {
    return NextResponse.json({ error: "groupId and roundId are required" }, { status: 400 });
  }

  // Create (or no-op) the DB wager_round row.
  const { error: rpcError } = await auth.supabase.rpc("initialize_wager_round", {
    p_group_id: groupId,
    p_round_id: roundId,
  });
  if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 400 });

  const admin = createAdminSupabaseClient();
  const { data: round } = await admin
    .from("wager_rounds")
    .select("approved_mint, approved_token_program, closes_at")
    .eq("group_id", groupId)
    .eq("round_id", roundId)
    .single();
  if (!round) return NextResponse.json({ error: "Wager round row missing after RPC" }, { status: 500 });

  const env = getWagerEnv();
  const byteaToBase58 = async (v: string) => {
    const { base58 } = await import("@scure/base");
    return base58.encode(new Uint8Array(Buffer.from((v as string).replace(/^\\x/, ""), "hex")));
  };
  const mint = await byteaToBase58(round.approved_mint as string);
  const tokenProgram = await byteaToBase58(round.approved_token_program as string);
  const closesAt = BigInt(Math.floor(new Date(round.closes_at as string).getTime() / 1000));

  let authority;
  try {
    authority = await loadWagerAuthoritySigner();
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Authority keypair error" }, { status: 500 });
  }
  const settlementAuthority = process.env.WAGER_SETTLEMENT_AUTHORITY ?? authority.address;

  const { instruction, wagerRound, vault } = await buildInitRoundInstruction({
    groupId, roundId, mint, tokenProgram,
    authority: authority.address, settlementAuthority, closesAt,
  });

  const rpc = createSolanaRpc(env.rpcUrl);

  // Idempotency: if the round PDA already exists, treat as already initialized.
  const existing = await rpc.getAccountInfo(address(wagerRound), { encoding: "base64" }).send();
  if (existing.value) {
    return NextResponse.json({ ok: true, wagerRound, vault, alreadyInitialized: true });
  }

  try {
    const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayerSigner(authority, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
      (m) => appendTransactionMessageInstructions([instruction], m),
    );
    const signed = await signTransactionMessageWithSigners(message);
    const signature = getSignatureFromTransaction(signed);
    await rpc
      .sendTransaction(getBase64EncodedWireTransaction(signed), { encoding: "base64", preflightCommitment: "confirmed" })
      .send();
    return NextResponse.json({ ok: true, wagerRound, vault, signature, alreadyInitialized: false }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "On-chain init failed" }, { status: 502 });
  }
}
```

- [ ] **Step 2: Typecheck + build** — `npx tsc --noEmit`, `npm run build`; resolve typing on `signTransactionMessageWithSigners` / signer generics.
- [ ] **Step 3: Commit** — `git add app/api/admin/wager/initialize/route.ts && git commit`.

---

## Task 8: Status route

**Files:**
- Create: `app/api/admin/wager/status/route.ts`

**Interfaces:**
- Produces: `GET ?group=&round=` → `{ configEnabled, wagerRoundExists, vaultExists, closesAt, stakeDisplay }`.
- Consumes: `assertAdmin`, `createAdminSupabaseClient`, `getWagerEnv`, `buildInitRoundInstruction` (to derive the vault address), `createSolanaRpc`.

- [ ] **Step 1: Implement** — read `group_wager_configs` (enabled), `wager_rounds` (row + closes_at + stake), derive vault via `buildInitRoundInstruction` (authority can be any valid address for derivation — reuse the round's mint/token program; pass `settlementAuthority = authority = mint` placeholder is fine since only the vault derivation is used), then `rpc.getAccountInfo(vault)` for `vaultExists`. Return JSON. Keep the derivation honest: derive vault directly with `deriveVaultAta(deriveWagerRoundPda(group,round).address, mint, tokenProgram)` instead of the full instruction builder.
- [ ] **Step 2: Typecheck + build**, then **Commit** — `git add app/api/admin/wager/status/route.ts && git commit`.

---

## Task 9: Admin UI page + panel + nav link

**Files:**
- Create: `app/[locale]/(admin)/admin/wager/page.tsx`
- Create: `app/[locale]/(admin)/admin/wager/wager-admin-panel.tsx`
- Modify: `components/admin/admin-shell.tsx` (add nav link to `/admin/wager`)

**Interfaces:**
- `page.tsx` (server) loads groups (`id, name`) and their rounds (`competition_rounds: id, name/label, round_id`) via `createAdminSupabaseClient`, passes to the panel.
- `WagerAdminPanel` (client) props: `groups: Array<{ id: string; name: string; rounds: Array<{ id: string; label: string }> }>`. Renders group select, config form (mint + stakeAmount → POST `/api/admin/wager/configure`), round select + "Initialize round" (POST `/api/admin/wager/initialize`), and a status area (GET `/api/admin/wager/status`). Shows returned errors inline and an explorer link for the init signature.

- [ ] **Step 1: Build the server page** — fetch groups + rounds, render `<WagerAdminPanel groups={...} />`. Follow the data-loading style of `app/[locale]/(admin)/admin/rounds/page.tsx`.
- [ ] **Step 2: Build the client panel** — three fetch handlers with loading/error state (mirror `components/wallet/wallet-link-button.tsx` state pattern). Warn if a `flagsLive` prop (passed from the page using `getWagerEnv().depositsEnabled && uiEnabled`) is false.
- [ ] **Step 3: Add nav link** — in `components/admin/admin-shell.tsx`, add an item linking to `/admin/wager` labeled "Wager", following the existing nav item shape.
- [ ] **Step 4: Biome + build** — `npx biome check --write` the new/modified files, `npm run build`.
- [ ] **Step 5: Manual verification** — with a devnet mint + funded `WAGER_AUTHORITY_KEYPAIR`, configure a pool, initialize a round, confirm the status panel turns all-green and the vault exists on-chain.
- [ ] **Step 6: Commit** — `git add` the three files and commit.

---

## Task 10: Env + ops documentation

**Files:**
- Modify: `lib/env.ts` (add `wagerAuthorityKeypair`, `wagerSettlementAuthority` passthroughs if reading via `env`), or document reading `process.env` directly in the routes.
- Modify: project README or `docs/` — document `WAGER_AUTHORITY_KEYPAIR`, `WAGER_SETTLEMENT_AUTHORITY`, and the enable-a-round runbook (configure → initialize → set `WAGER_UI_ENABLED` / `WAGER_DEPOSITS_ENABLED`).

- [ ] **Step 1: Add env docs + any passthroughs**, `npm run build`.
- [ ] **Step 2: Commit.**

---

## Self-Review

**Spec coverage:** Audience/placement → Task 1 (migration) + Task 5 (admin guard) + Task 9 (admin-area page). Auto-derive mint → Task 2 + Task 6. On-chain init (full) → Task 3 + Task 7. Status panel → Task 8 + Task 9. RPC relaxation → Task 1. Shared builder + script refactor → Task 3. Env/secrets → Task 4 + Task 10. Error handling → Tasks 6–8 (explicit statuses + idempotency). Testing → Tasks 1–4 have unit tests; routes kept thin. Security → Task 5 (server re-check) + Task 1 (RPC defense in depth). No gaps.

**Placeholder scan:** Task 3 Step 3 intentionally contains a wrong placeholder line with an explicit NOTE instructing the implementer to use `getWagerEnv().programId as Address` — call it out during execution and replace it. No other placeholders.

**Type consistency:** `buildInitRoundInstruction` returns `{ instruction, wagerRound, vault }` (strings) and is consumed as such in Tasks 7–8. `parseMintAccount` / `stakeToBaseUnits` signatures match their Task 6 use. `assertAdmin` discriminated union matches Tasks 6–8 usage. `loadWagerAuthoritySigner` returns a signer with `.address`, used in Task 7.
