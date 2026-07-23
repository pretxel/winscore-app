import { describe, expect, it } from "vitest";
import {
  buildChallengeParams,
  formatChallengeMessage,
  generateNonce,
} from "@/lib/wallet/challenge";

describe("challenge", () => {
  it("formats challenge message with all fields", () => {
    const params = buildChallengeParams(
      "localhost",
      "user-123",
      "4kdasHzm61vZ1GJNCxSJorHb8hEYFd36RvugXcPQEnM3",
      "devnet",
    );

    const message = formatChallengeMessage(params);

    expect(message).toContain("winscore.solana.wallet-link.v1");
    expect(message).toContain("Domain: localhost");
    expect(message).toContain("User: user-123");
    expect(message).toContain("Wallet: 4kdasHzm61vZ1GJNCxSJorHb8hEYFd36RvugXcPQEnM3");
    expect(message).toContain("Cluster: devnet");
    expect(message).toContain("Issued: ");
    expect(message).toContain("Expires: ");
    expect(message).toContain("Nonce: ");
  });

  it("generates unique nonces", () => {
    const n1 = generateNonce();
    const n2 = generateNonce();
    expect(Buffer.compare(Buffer.from(n1), Buffer.from(n2))).not.toBe(0);
  });

  it("nonce is exactly 32 bytes", () => {
    expect(generateNonce().length).toBe(32);
  });

  it("expiry is 5 minutes after issued", () => {
    const params = buildChallengeParams("localhost", "u1", "wallet", "devnet");
    const diff = params.expiresAt.getTime() - params.issuedAt.getTime();
    expect(diff).toBe(300_000);
  });

  it("deterministic message for same params", () => {
    const nonce = generateNonce();
    const now = new Date("2026-07-23T00:00:00Z");
    const expires = new Date("2026-07-23T00:05:00Z");

    const params1 = {
      domain: "localhost",
      userId: "u1",
      walletAddressBase58: "wallet",
      cluster: "devnet" as const,
      nonce,
      issuedAt: now,
      expiresAt: expires,
    };

    const params2 = { ...params1 };
    expect(formatChallengeMessage(params1)).toBe(formatChallengeMessage(params2));
  });
});
