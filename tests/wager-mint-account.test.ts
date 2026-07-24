import { describe, expect, it } from "vitest";
import { TOKEN_PROGRAM_ADDRESS } from "@/lib/wager/instructions";
import {
  parseMintAccount,
  stakeToBaseUnits,
  TOKEN_2022_PROGRAM_ADDRESS,
} from "@/lib/wager/mint-account";

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
