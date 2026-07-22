/**
 * Domain-separated Merkle tree for wager settlement claims.
 * Leaves: SHA-256(wager_round_pubkey || winner_wallet || amount_le_u64)
 * Nodes: SHA-256(sorted(left, right))
 *
 * This mirrors the Rust program's claim verification logic exactly.
 */

import { createHash } from "crypto";

/**
 * Build a Merkle tree from a list of (winner_wallet_bytes, award_base_units) tuples.
 * Returns the Merkle root and a map of wallet → proof.
 */
export interface MerkleLeaf {
  winnerWalletBytes: Uint8Array;
  awardBaseUnits: number;
}

export interface MerkleTreeResult {
  root: Uint8Array;
  proofs: Map<string, Uint8Array[]>;
}

const DOMAIN_SEPARATOR = Buffer.from("winscore-wager-claim-v1");

function hashLeaf(
  wagerRoundPubkey: Uint8Array,
  winnerWallet: Uint8Array,
  amount: number,
): Buffer {
  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(BigInt(amount));

  const h = createHash("sha256");
  h.update(DOMAIN_SEPARATOR);
  h.update(Buffer.from(wagerRoundPubkey));
  h.update(Buffer.from(winnerWallet));
  h.update(amountBuf);
  return h.digest();
}

function hashPair(left: Buffer, right: Buffer): Buffer {
  const h = createHash("sha256");
  if (Buffer.compare(left, right) <= 0) {
    h.update(left);
    h.update(right);
  } else {
    h.update(right);
    h.update(left);
  }
  return h.digest();
}

export function buildMerkleTree(
  wagerRoundPubkey: Uint8Array,
  leaves: MerkleLeaf[],
): MerkleTreeResult {
  if (leaves.length === 0) {
    return { root: Buffer.alloc(32), proofs: new Map() };
  }

  if (leaves.length === 1) {
    const leaf = leaves[0];
    const leafHash = hashLeaf(
      wagerRoundPubkey,
      leaf.winnerWalletBytes,
      leaf.awardBaseUnits,
    );
    const root = hashPair(leafHash, leafHash); // convention: single leaf → hash(leaf, leaf)
    const key = Buffer.from(leaf.winnerWalletBytes).toString("hex");
    const proofs = new Map<string, Uint8Array[]>();
    proofs.set(key, []);
    return { root, proofs };
  }

  // Build leaf hashes
  const leafEntries = leaves.map((leaf) => ({
    key: Buffer.from(leaf.winnerWalletBytes).toString("hex"),
    hash: hashLeaf(
      wagerRoundPubkey,
      leaf.winnerWalletBytes,
      leaf.awardBaseUnits,
    ),
  }));

  const proofsMap = new Map<string, Buffer[]>();
  for (const le of leafEntries) {
    proofsMap.set(le.key, []);
  }

  // Track which leaves are under each node as we build
  let layerHashes = leafEntries.map((le) => le.hash);
  let layerKeys = leafEntries.map((le) => [le.key]);

  while (layerHashes.length > 1) {
    const nextHashes: Buffer[] = [];
    const nextKeys: string[][] = [];

    for (let i = 0; i < layerHashes.length; i += 2) {
      const leftHash = layerHashes[i];
      const rightHash = layerHashes[i + 1] ?? layerHashes[i];
      const parent = hashPair(leftHash, rightHash);

      const leftKeys = layerKeys[i];
      const rightKeys = layerKeys[i + 1] ?? leftKeys;

      nextHashes.push(parent);
      nextKeys.push([...new Set([...leftKeys, ...rightKeys])]);

      // Add sibling proof elements
      for (const key of leftKeys) {
        proofsMap.get(key)?.push(rightHash);
      }
      // Only add for rightKeys that are NOT also in leftKeys (avoid duplicates in odd case)
      for (const key of rightKeys) {
        if (!leftKeys.includes(key)) {
          proofsMap.get(key)?.push(leftHash);
        }
      }
    }

    layerHashes = nextHashes;
    layerKeys = nextKeys;
  }

  const result = new Map<string, Uint8Array[]>();
  for (const [key, proofs] of proofsMap) {
    result.set(key, proofs.map((p) => new Uint8Array(p as unknown as ArrayBuffer)));
  }

  return { root: layerHashes[0], proofs: result };
}

/**
 * Verify a Merkle proof for a single claim.
 */
export function verifyMerkleProof(
  root: Uint8Array,
  wagerRoundPubkey: Uint8Array,
  winnerWallet: Uint8Array,
  amount: number,
  proof: Uint8Array[],
): boolean {
  let hash = hashLeaf(wagerRoundPubkey, winnerWallet, amount);

  if (proof.length === 0) {
    hash = hashPair(hash, hash);
  } else {
    for (const p of proof) {
      const proofBuf = Buffer.from(p);
      hash = hashPair(hash, proofBuf);
    }
  }

  return Buffer.compare(hash, Buffer.from(root)) === 0;
}
