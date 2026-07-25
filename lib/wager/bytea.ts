/**
 * Postgres `bytea` ↔ bytes conversion.
 *
 * supabase-js returns bytea columns as hex-escaped strings (`\x0a1b…`), so every
 * on-chain byte string (wallet pubkeys, mints, commitments, PDAs) needs decoding
 * before it can be compared with or hashed alongside chain data.
 */

/** Decode a Postgres hex-escaped `bytea` into bytes. Returns null on anything else. */
export function byteaToBytes(value: unknown): Uint8Array | null {
  if (typeof value !== "string") return null;
  const hex = value.replace(/^\\x/, "");
  return hex ? new Uint8Array(Buffer.from(hex, "hex")) : null;
}

/** Decode a `bytea` expected to hold exactly `length` bytes. Throws otherwise. */
export function requireBytea(value: unknown, length: number, label: string): Uint8Array {
  const bytes = byteaToBytes(value);
  if (!bytes) throw new Error(`${label} is not a bytea value`);
  if (bytes.length !== length) {
    throw new Error(`${label} must be ${length} bytes, got ${bytes.length}`);
  }
  return bytes;
}

/** Encode bytes as a Postgres hex-escaped `bytea` literal. */
export function bytesToBytea(bytes: Uint8Array): string {
  return `\\x${Buffer.from(bytes).toString("hex")}`;
}
