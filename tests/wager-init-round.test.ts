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
