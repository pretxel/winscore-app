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
