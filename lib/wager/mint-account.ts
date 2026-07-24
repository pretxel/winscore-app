import { TOKEN_PROGRAM_ADDRESS } from "@/lib/wager/instructions";

export const TOKEN_2022_PROGRAM_ADDRESS = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

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
