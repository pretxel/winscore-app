import { readFileSync } from "node:fs";
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

/**
 * Resolve WAGER_AUTHORITY_KEYPAIR to keypair JSON, accepting either an inline
 * byte array or a path to a Solana CLI keypair file.
 *
 * scripts/init-wager-round.ts already accepted both; the server path accepted
 * only inline, so a local .env pointing at ~/.config/solana/... failed here
 * while the CLI worked. Supporting a path also keeps the secret out of the
 * environment on operator machines.
 */
export function resolveKeypairJson(raw: string): string {
  if (raw.trimStart().startsWith("[")) return raw;
  try {
    return readFileSync(raw, "utf8");
  } catch {
    throw new Error(
      "WAGER_AUTHORITY_KEYPAIR is neither inline JSON nor a readable keypair file path",
    );
  }
}

/** Load the server-side wager authority signer from the environment. */
export async function loadWagerAuthoritySigner(): Promise<KeyPairSigner> {
  const raw = process.env.WAGER_AUTHORITY_KEYPAIR;
  if (!raw) {
    throw new Error("WAGER_AUTHORITY_KEYPAIR is not set");
  }
  return createKeyPairSignerFromBytes(parseKeypairSecret(resolveKeypairJson(raw)));
}
