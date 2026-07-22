import { randomBytes } from "crypto";

/**
 * Versioned challenge formatter for wallet link verification.
 * Produces exact UTF-8 bytes for the message the wallet must sign.
 *
 * Message format:
 *   winscore.solana.wallet-link.v1
 *   Domain: {domain}
 *   User: {userId}
 *   Wallet: {walletAddressBase58}
 *   Cluster: devnet
 *   Issued: {issuedAtISO}
 *   Expires: {expiresAtISO}
 *   Nonce: {nonceHex}
 */

const CHALLENGE_VERSION = "v1";

export interface ChallengeParams {
  domain: string;
  userId: string;
  walletAddressBase58: string;
  cluster: string;
  nonce: Uint8Array;
  issuedAt: Date;
  expiresAt: Date;
}

export function formatChallengeMessage(params: ChallengeParams): string {
  const nonceHex = Buffer.from(params.nonce).toString("hex");
  return [
    `winscore.solana.wallet-link.${CHALLENGE_VERSION}`,
    `Domain: ${params.domain}`,
    `User: ${params.userId}`,
    `Wallet: ${params.walletAddressBase58}`,
    `Cluster: ${params.cluster}`,
    `Issued: ${params.issuedAt.toISOString()}`,
    `Expires: ${params.expiresAt.toISOString()}`,
    `Nonce: ${nonceHex}`,
  ].join("\n");
}

export function challengeExpirySeconds(): number {
  return 300; // 5 minutes for Devnet
}

export function generateNonce(): Uint8Array {
  return randomBytes(32);
}

export function buildChallengeParams(
  domain: string,
  userId: string,
  walletAddressBase58: string,
  cluster: string = "devnet",
): ChallengeParams {
  const now = new Date();
  return {
    domain,
    userId,
    walletAddressBase58,
    cluster,
    nonce: generateNonce(),
    issuedAt: now,
    expiresAt: new Date(now.getTime() + challengeExpirySeconds() * 1000),
  };
}
