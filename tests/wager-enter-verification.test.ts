import { base58 } from "@scure/base";
import { describe, expect, it } from "vitest";
import { type ExpectedEnter, verifyConfirmedEnter } from "@/lib/wager/enter-verification";
import { ENTER_DISCRIMINATOR } from "@/lib/wager/instructions";

const PROGRAM = "9q5fBczvg3XYipRmxY5tt3axGgNQfYtGeaDpbMHMLkmi";

const addr = (fill: number) => base58.encode(new Uint8Array(32).fill(fill));

const ENTRANT = addr(1);
const WAGER_ROUND = addr(2);
const ENTRY = addr(3);
const VAULT = addr(4);
const MINT = addr(5);
const TOKEN_PROGRAM = addr(6);
const SYSTEM = addr(0);

const PICK = new Uint8Array(32).fill(0xaa);
const INTENT_HASH = new Uint8Array(32).fill(0xbb);
const STAKE = 1_000_000n;

function encodeData(opts?: {
  discriminator?: Uint8Array;
  stake?: bigint;
  pick?: Uint8Array;
  intentHash?: Uint8Array;
}) {
  const disc = opts?.discriminator ?? ENTER_DISCRIMINATOR;
  const stake = opts?.stake ?? STAKE;
  const pick = opts?.pick ?? PICK;
  const intentHash = opts?.intentHash ?? INTENT_HASH;
  const data = new Uint8Array(8 + 8 + 32 + 32);
  data.set(disc, 0);
  for (let i = 0; i < 8; i++) data[8 + i] = Number((stake >> BigInt(8 * i)) & 0xffn);
  data.set(pick, 16);
  data.set(intentHash, 48);
  return base58.encode(data);
}

function makeTx(opts?: {
  err?: unknown;
  data?: string;
  programId?: string;
  accounts?: string[];
  vaultPost?: string;
  vaultPre?: string;
}) {
  return {
    slot: 4242,
    meta: {
      err: opts?.err ?? null,
      preTokenBalances: [
        { owner: WAGER_ROUND, mint: MINT, uiTokenAmount: { amount: opts?.vaultPre ?? "0" } },
      ],
      postTokenBalances: [
        {
          owner: WAGER_ROUND,
          mint: MINT,
          uiTokenAmount: { amount: opts?.vaultPost ?? STAKE.toString() },
        },
      ],
    },
    transaction: {
      message: {
        accountKeys: [{ pubkey: ENTRANT }],
        instructions: [
          {
            programId: opts?.programId ?? PROGRAM,
            accounts: opts?.accounts ?? [
              ENTRANT,
              WAGER_ROUND,
              ENTRY,
              addr(7),
              VAULT,
              MINT,
              TOKEN_PROGRAM,
              SYSTEM,
            ],
            data: opts?.data ?? encodeData(),
          },
        ],
      },
    },
  };
}

const expected: ExpectedEnter = {
  programId: PROGRAM,
  entrant: ENTRANT,
  wagerRound: WAGER_ROUND,
  entry: ENTRY,
  vault: VAULT,
  stakeBaseUnits: STAKE,
  pickCommitment: PICK,
  intentHash: INTENT_HASH,
};

describe("verifyConfirmedEnter", () => {
  it("verifies a well-formed enter transaction", () => {
    const result = verifyConfirmedEnter(makeTx(), expected);
    expect(result.verified).toBe(true);
    expect(result.blockSlot).toBe(4242);
  });

  it("rejects a null transaction", () => {
    expect(verifyConfirmedEnter(null, expected).verified).toBe(false);
  });

  it("rejects a failed transaction", () => {
    const result = verifyConfirmedEnter(
      makeTx({ err: { InstructionError: [0, "Custom"] } }),
      expected,
    );
    expect(result.verified).toBe(false);
    expect(result.error).toContain("failed");
  });

  it("rejects when the wager program was never invoked", () => {
    const result = verifyConfirmedEnter(makeTx({ programId: addr(9) }), expected);
    expect(result.verified).toBe(false);
    expect(result.error).toContain("program instruction not present");
  });

  it("rejects a non-enter discriminator", () => {
    const data = encodeData({ discriminator: new Uint8Array(8).fill(0xff) });
    const result = verifyConfirmedEnter(makeTx({ data }), expected);
    expect(result.verified).toBe(false);
    expect(result.error).toContain("not `enter`");
  });

  it("rejects a stake amount mismatch", () => {
    const data = encodeData({ stake: 999n });
    const result = verifyConfirmedEnter(makeTx({ data }), expected);
    expect(result.verified).toBe(false);
    expect(result.error).toContain("Stake");
  });

  it("rejects a pick commitment mismatch", () => {
    const data = encodeData({ pick: new Uint8Array(32).fill(0x01) });
    const result = verifyConfirmedEnter(makeTx({ data }), expected);
    expect(result.verified).toBe(false);
    expect(result.error).toContain("Pick commitment");
  });

  it("rejects an intent hash mismatch", () => {
    const data = encodeData({ intentHash: new Uint8Array(32).fill(0x02) });
    const result = verifyConfirmedEnter(makeTx({ data }), expected);
    expect(result.verified).toBe(false);
    expect(result.error).toContain("Intent hash");
  });

  it("rejects a missing required account", () => {
    const accounts = [ENTRANT, WAGER_ROUND, ENTRY, addr(7), MINT, TOKEN_PROGRAM, SYSTEM];
    const result = verifyConfirmedEnter(makeTx({ accounts }), expected);
    expect(result.verified).toBe(false);
    expect(result.error).toContain("vault");
  });

  it("rejects when the vault balance did not grow by the stake", () => {
    const result = verifyConfirmedEnter(makeTx({ vaultPost: "500000" }), expected);
    expect(result.verified).toBe(false);
    expect(result.error).toContain("Vault balance delta");
  });

  it("rejects when the vault balance is not observable", () => {
    const tx = makeTx();
    tx.meta.postTokenBalances = [];
    const result = verifyConfirmedEnter(tx, expected);
    expect(result.verified).toBe(false);
    expect(result.error).toContain("not observable");
  });
});
