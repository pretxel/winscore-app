import { AccountRole, type Address } from "@solana/kit";
import { describe, expect, it } from "vitest";
import {
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  buildEnterInstruction,
  buildInitializeWagerRoundInstruction,
  ENTER_DISCRIMINATOR,
  INITIALIZE_WAGER_ROUND_DISCRIMINATOR,
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
