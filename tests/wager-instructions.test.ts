import { readFileSync } from "node:fs";
import { AccountRole, type Address } from "@solana/kit";
import { describe, expect, it } from "vitest";
import {
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  buildCancelAndRefundInstruction,
  buildClaimInstruction,
  buildEnterInstruction,
  buildInitializeWagerRoundInstruction,
  buildLockInstruction,
  buildRefundInstruction,
  buildSettleInstruction,
  CANCEL_AND_REFUND_DISCRIMINATOR,
  CLAIM_DISCRIMINATOR,
  ENTER_DISCRIMINATOR,
  INITIALIZE_WAGER_ROUND_DISCRIMINATOR,
  LOCK_DISCRIMINATOR,
  REFUND_DISCRIMINATOR,
  SETTLE_DISCRIMINATOR,
  SYSTEM_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
} from "@/lib/wager/instructions";

const PROGRAM = "9q5fBczvg3XYipRmxY5tt3axGgNQfYtGeaDpbMHMLkmi" as Address;
const A = (s: string) => s as Address;

describe("buildEnterInstruction", () => {
  const accounts = {
    entrant: A("5WReDH2phKadrF1f6jzx7ddscKZVbtoZsNgZ2Egt1NuB"),
    wagerRound: A("HhS536q9hhiMn7hxTZg91sj1kdkPgrHqGJ9NChot6vkq"),
    entry: A("So11111111111111111111111111111111111111112"),
    entrantTokenAccount: A("So11111111111111111111111111111111111111112"),
    vault: A("So11111111111111111111111111111111111111112"),
    approvedMint: A("So11111111111111111111111111111111111111112"),
  };

  it("prefixes the correct discriminator and encodes u64 stake little-endian", () => {
    const ix = buildEnterInstruction(PROGRAM, accounts, {
      stakeBaseUnits: 1n,
      pickCommitment: new Uint8Array(32).fill(0xaa),
      intentHash: new Uint8Array(32).fill(0xbb),
    });

    const data = ix.data as Uint8Array;
    // 8 disc + 8 u64 + 32 pick + 32 intent = 80 bytes
    expect(data.length).toBe(80);
    expect([...data.slice(0, 8)]).toEqual([...ENTER_DISCRIMINATOR]);
    // u64 = 1 little-endian
    expect([...data.slice(8, 16)]).toEqual([1, 0, 0, 0, 0, 0, 0, 0]);
    expect([...data.slice(16, 48)]).toEqual(Array(32).fill(0xaa));
    expect([...data.slice(48, 80)]).toEqual(Array(32).fill(0xbb));
  });

  it("orders accounts and roles exactly per the IDL", () => {
    const ix = buildEnterInstruction(PROGRAM, accounts, {
      stakeBaseUnits: 42n,
      pickCommitment: new Uint8Array(32),
      intentHash: new Uint8Array(32),
    });

    expect(ix.programAddress).toBe(PROGRAM);
    const roles = ix.accounts?.map((a) => a.role);
    expect(roles).toEqual([
      AccountRole.WRITABLE_SIGNER, // entrant
      AccountRole.WRITABLE, // wager_round
      AccountRole.WRITABLE, // entry
      AccountRole.WRITABLE, // entrant_token_account
      AccountRole.WRITABLE, // vault
      AccountRole.READONLY, // approved_mint
      AccountRole.READONLY, // token_program
      AccountRole.READONLY, // system_program
    ]);
    const addrs = ix.accounts?.map((a) => a.address);
    expect(addrs?.[0]).toBe(accounts.entrant);
    expect(addrs?.[6]).toBe(TOKEN_PROGRAM_ADDRESS);
    expect(addrs?.[7]).toBe(SYSTEM_PROGRAM_ADDRESS);
  });
});

describe("buildInitializeWagerRoundInstruction", () => {
  it("encodes the discriminator and 9 accounts with the associated-token program", () => {
    const ix = buildInitializeWagerRoundInstruction(
      PROGRAM,
      {
        authority: A("5WReDH2phKadrF1f6jzx7ddscKZVbtoZsNgZ2Egt1NuB"),
        wagerRound: A("HhS536q9hhiMn7hxTZg91sj1kdkPgrHqGJ9NChot6vkq"),
        approvedMint: A("So11111111111111111111111111111111111111112"),
        vault: A("So11111111111111111111111111111111111111112"),
        rentRecipientA: A("5WReDH2phKadrF1f6jzx7ddscKZVbtoZsNgZ2Egt1NuB"),
        rentRecipientB: A("5WReDH2phKadrF1f6jzx7ddscKZVbtoZsNgZ2Egt1NuB"),
      },
      {
        groupId: new Uint8Array(16).fill(0x11),
        roundId: new Uint8Array(16).fill(0x22),
        closesAt: 1_800_000_000n,
        refundTimeout: 172_800n,
        maxParticipants: 100,
        maxTotalStake: 1_000_000n,
        settlementAuthority: A("5WReDH2phKadrF1f6jzx7ddscKZVbtoZsNgZ2Egt1NuB"),
      },
    );

    const data = ix.data as Uint8Array;
    expect([...data.slice(0, 8)]).toEqual([...INITIALIZE_WAGER_ROUND_DISCRIMINATOR]);
    // 8 disc + 16 group + 16 round + 8 closes + 8 refund + 2 maxpart + 8 maxstake + 32 authority
    expect(data.length).toBe(98);
    expect(ix.accounts?.length).toBe(9);
    expect(ix.accounts?.[8].address).toBe(ASSOCIATED_TOKEN_PROGRAM_ADDRESS);
  });
});

// A wrong discriminator or account order fails on chain with an opaque error, so
// check the transcription against the IDL itself rather than against constants
// copied the same way twice.
describe("IDL conformance", () => {
  interface IdlInstruction {
    name: string;
    discriminator: number[];
    accounts: Array<{ name: string; writable?: boolean; signer?: boolean }>;
  }
  const idl = JSON.parse(
    readFileSync("solana/winscore-wager/target/idl/winscore_wager.json", "utf8"),
  ) as { instructions: IdlInstruction[] };

  const byName = (name: string) => {
    const ix = idl.instructions.find((i) => i.name === name);
    if (!ix) throw new Error(`IDL has no instruction ${name}`);
    return ix;
  };

  const expectedRole = (a: { writable?: boolean; signer?: boolean }) => {
    if (a.signer) return a.writable ? AccountRole.WRITABLE_SIGNER : AccountRole.READONLY_SIGNER;
    return a.writable ? AccountRole.WRITABLE : AccountRole.READONLY;
  };

  const cases: Array<{
    name: string;
    discriminator: Uint8Array;
    build: () => ReturnType<typeof buildLockInstruction>;
  }> = [
    {
      name: "lock",
      discriminator: LOCK_DISCRIMINATOR,
      build: () => buildLockInstruction(PROGRAM, A("HhS536q9hhiMn7hxTZg91sj1kdkPgrHqGJ9NChot6vkq")),
    },
    {
      name: "settle",
      discriminator: SETTLE_DISCRIMINATOR,
      build: () =>
        buildSettleInstruction(
          PROGRAM,
          {
            settlementAuthority: A("5WReDH2phKadrF1f6jzx7ddscKZVbtoZsNgZ2Egt1NuB"),
            wagerRound: A("HhS536q9hhiMn7hxTZg91sj1kdkPgrHqGJ9NChot6vkq"),
            vault: A("So11111111111111111111111111111111111111112"),
          },
          {
            manifestHash: new Uint8Array(32).fill(0x01),
            merkleRoot: new Uint8Array(32).fill(0x02),
            winnerCount: 3,
            totalDistributable: 900n,
          },
        ),
    },
    {
      name: "claim",
      discriminator: CLAIM_DISCRIMINATOR,
      build: () =>
        buildClaimInstruction(
          PROGRAM,
          {
            winner: A("5WReDH2phKadrF1f6jzx7ddscKZVbtoZsNgZ2Egt1NuB"),
            wagerRound: A("HhS536q9hhiMn7hxTZg91sj1kdkPgrHqGJ9NChot6vkq"),
            claim: A("So11111111111111111111111111111111111111112"),
            vault: A("So11111111111111111111111111111111111111112"),
            winnerTokenAccount: A("So11111111111111111111111111111111111111112"),
          },
          { amount: 300n, proof: [new Uint8Array(32).fill(0x03)] },
        ),
    },
    {
      name: "cancel_and_refund",
      discriminator: CANCEL_AND_REFUND_DISCRIMINATOR,
      build: () =>
        buildCancelAndRefundInstruction(PROGRAM, {
          caller: A("5WReDH2phKadrF1f6jzx7ddscKZVbtoZsNgZ2Egt1NuB"),
          wagerRound: A("HhS536q9hhiMn7hxTZg91sj1kdkPgrHqGJ9NChot6vkq"),
        }),
    },
    {
      name: "refund",
      discriminator: REFUND_DISCRIMINATOR,
      build: () =>
        buildRefundInstruction(PROGRAM, {
          entrant: A("5WReDH2phKadrF1f6jzx7ddscKZVbtoZsNgZ2Egt1NuB"),
          wagerRound: A("HhS536q9hhiMn7hxTZg91sj1kdkPgrHqGJ9NChot6vkq"),
          entry: A("So11111111111111111111111111111111111111112"),
          vault: A("So11111111111111111111111111111111111111112"),
          entrantTokenAccount: A("So11111111111111111111111111111111111111112"),
        }),
    },
  ];

  for (const { name, discriminator, build } of cases) {
    it(`${name} matches the IDL discriminator, account count, and roles`, () => {
      const idlIx = byName(name);
      expect([...discriminator]).toEqual(idlIx.discriminator);

      const ix = build();
      expect((ix.data as Uint8Array).slice(0, 8)).toEqual(discriminator);
      expect(ix.accounts?.length).toBe(idlIx.accounts.length);
      expect(ix.accounts?.map((a) => a.role)).toEqual(idlIx.accounts.map(expectedRole));
    });
  }

  it("also pins the two deposit-path instructions to the IDL", () => {
    expect([...ENTER_DISCRIMINATOR]).toEqual(byName("enter").discriminator);
    expect([...INITIALIZE_WAGER_ROUND_DISCRIMINATOR]).toEqual(
      byName("initialize_wager_round").discriminator,
    );
  });
});

describe("buildSettleInstruction", () => {
  it("encodes manifest hash, merkle root, u16 count, and u64 distributable", () => {
    const ix = buildSettleInstruction(
      PROGRAM,
      {
        settlementAuthority: A("5WReDH2phKadrF1f6jzx7ddscKZVbtoZsNgZ2Egt1NuB"),
        wagerRound: A("HhS536q9hhiMn7hxTZg91sj1kdkPgrHqGJ9NChot6vkq"),
        vault: A("So11111111111111111111111111111111111111112"),
      },
      {
        manifestHash: new Uint8Array(32).fill(0xaa),
        merkleRoot: new Uint8Array(32).fill(0xbb),
        winnerCount: 258, // 0x0102 → checks the u16 is little-endian
        totalDistributable: 1n,
      },
    );

    const data = ix.data as Uint8Array;
    // 8 disc + 32 manifest + 32 root + 2 count + 8 distributable = 82
    expect(data.length).toBe(82);
    expect([...data.slice(8, 40)]).toEqual(Array(32).fill(0xaa));
    expect([...data.slice(40, 72)]).toEqual(Array(32).fill(0xbb));
    expect([...data.slice(72, 74)]).toEqual([0x02, 0x01]);
    expect([...data.slice(74, 82)]).toEqual([1, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe("buildClaimInstruction", () => {
  it("length-prefixes the proof vector as u32 little-endian", () => {
    const ix = buildClaimInstruction(
      PROGRAM,
      {
        winner: A("5WReDH2phKadrF1f6jzx7ddscKZVbtoZsNgZ2Egt1NuB"),
        wagerRound: A("HhS536q9hhiMn7hxTZg91sj1kdkPgrHqGJ9NChot6vkq"),
        claim: A("So11111111111111111111111111111111111111112"),
        vault: A("So11111111111111111111111111111111111111112"),
        winnerTokenAccount: A("So11111111111111111111111111111111111111112"),
      },
      {
        amount: 500n,
        proof: [new Uint8Array(32).fill(0x11), new Uint8Array(32).fill(0x22)],
      },
    );

    const data = ix.data as Uint8Array;
    // 8 disc + 8 amount + 4 vec len + 2 * 32 elements = 84
    expect(data.length).toBe(84);
    expect([...data.slice(8, 16)]).toEqual([0xf4, 0x01, 0, 0, 0, 0, 0, 0]); // 500 LE
    expect([...data.slice(16, 20)]).toEqual([2, 0, 0, 0]);
    expect([...data.slice(20, 52)]).toEqual(Array(32).fill(0x11));
    expect([...data.slice(52, 84)]).toEqual(Array(32).fill(0x22));
  });

  it("encodes a lone winner's empty proof as a zero-length vector", () => {
    const ix = buildClaimInstruction(
      PROGRAM,
      {
        winner: A("5WReDH2phKadrF1f6jzx7ddscKZVbtoZsNgZ2Egt1NuB"),
        wagerRound: A("HhS536q9hhiMn7hxTZg91sj1kdkPgrHqGJ9NChot6vkq"),
        claim: A("So11111111111111111111111111111111111111112"),
        vault: A("So11111111111111111111111111111111111111112"),
        winnerTokenAccount: A("So11111111111111111111111111111111111111112"),
      },
      { amount: 1000n, proof: [] },
    );

    const data = ix.data as Uint8Array;
    expect(data.length).toBe(20);
    expect([...data.slice(16, 20)]).toEqual([0, 0, 0, 0]);
  });
});

describe("argument-free instructions", () => {
  it("carry only the discriminator as data", () => {
    const lock = buildLockInstruction(PROGRAM, A("HhS536q9hhiMn7hxTZg91sj1kdkPgrHqGJ9NChot6vkq"));
    expect((lock.data as Uint8Array).length).toBe(8);

    const refund = buildRefundInstruction(PROGRAM, {
      entrant: A("5WReDH2phKadrF1f6jzx7ddscKZVbtoZsNgZ2Egt1NuB"),
      wagerRound: A("HhS536q9hhiMn7hxTZg91sj1kdkPgrHqGJ9NChot6vkq"),
      entry: A("So11111111111111111111111111111111111111112"),
      vault: A("So11111111111111111111111111111111111111112"),
      entrantTokenAccount: A("So11111111111111111111111111111111111111112"),
    });
    expect((refund.data as Uint8Array).length).toBe(8);
  });

  it("locks without a signer, so any crank can close entry", () => {
    const lock = buildLockInstruction(PROGRAM, A("HhS536q9hhiMn7hxTZg91sj1kdkPgrHqGJ9NChot6vkq"));
    expect(lock.accounts?.some((a) => a.role === AccountRole.WRITABLE_SIGNER)).toBe(false);
    expect(lock.accounts?.some((a) => a.role === AccountRole.READONLY_SIGNER)).toBe(false);
  });
});
