/**
 * Initialize a wager round on-chain (devnet).
 *
 * Signs `initialize_wager_round` with an authority keypair, creating the round
 * PDA and its vault ATA so the app's `enter` deposit can succeed. Run manually
 * for E2E; production would gate this behind a server route.
 *
 * Usage:
 *   pnpm tsx scripts/init-wager-round.ts \
 *     --group <group-uuid> --round <round-uuid> \
 *     --closes-at <unix-seconds> [--settlement <pubkey>]
 *
 * Env:
 *   WAGER_AUTHORITY_KEYPAIR  path to a devnet keypair JSON (fee payer + authority)
 *   WAGER_PROGRAM_ID         defaults to the declared program id
 *   WAGER_APPROVED_MINT      required — the approved SPL mint
 *   WAGER_RPC_URL            defaults to devnet
 *   WAGER_TOKEN_PROGRAM      defaults to classic SPL Token
 */

import { readFileSync } from "node:fs";
import {
  address,
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getProgramDerivedAddress,
  getSignatureFromTransaction,
  getUtf8Encoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import { findAssociatedTokenPda } from "@solana-program/token";
import { buildInitializeWagerRoundInstruction } from "@/lib/wager/instructions";

const DEFAULT_PROGRAM_ID = "9q5fBczvg3XYipRmxY5tt3axGgNQfYtGeaDpbMHMLkmi";
const DEFAULT_TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const DEFAULT_RPC = "https://api.devnet.solana.com";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function uuidToBytes(uuid: string): Uint8Array {
  return Uint8Array.from(Buffer.from(uuid.replace(/-/g, ""), "hex"));
}

async function main() {
  const groupId = arg("group");
  const roundId = arg("round");
  const closesAt = arg("closes-at");
  if (!groupId || !roundId || !closesAt) {
    throw new Error("Required: --group <uuid> --round <uuid> --closes-at <unix-seconds>");
  }

  const keypairPath = process.env.WAGER_AUTHORITY_KEYPAIR;
  if (!keypairPath) throw new Error("WAGER_AUTHORITY_KEYPAIR is required");
  const mintStr = process.env.WAGER_APPROVED_MINT;
  if (!mintStr) throw new Error("WAGER_APPROVED_MINT is required");

  const programId = address(process.env.WAGER_PROGRAM_ID ?? DEFAULT_PROGRAM_ID);
  const mint = address(mintStr);
  const tokenProgram = address(process.env.WAGER_TOKEN_PROGRAM ?? DEFAULT_TOKEN_PROGRAM);
  const rpcUrl = process.env.WAGER_RPC_URL ?? DEFAULT_RPC;

  const secret = new Uint8Array(JSON.parse(readFileSync(keypairPath, "utf8")));
  const authority = await createKeyPairSignerFromBytes(secret);
  const settlementAuthority = address(arg("settlement") ?? authority.address);

  const [wagerRound] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getUtf8Encoder().encode("wager-round"),
      Uint8Array.of(1),
      uuidToBytes(groupId),
      uuidToBytes(roundId),
    ],
  });
  const [vault] = await findAssociatedTokenPda({ owner: wagerRound, mint, tokenProgram });

  const ix = buildInitializeWagerRoundInstruction(
    programId,
    {
      authority: authority.address,
      wagerRound,
      approvedMint: mint,
      vault,
      rentRecipientA: authority.address,
      rentRecipientB: authority.address,
      tokenProgram,
    },
    {
      groupId: uuidToBytes(groupId),
      roundId: uuidToBytes(roundId),
      closesAt: BigInt(closesAt),
      refundTimeout: BigInt(172_800), // 48h
      maxParticipants: 1000,
      maxTotalStake: BigInt(1_000_000_000_000),
      settlementAuthority,
    },
  );

  const rpc = createSolanaRpc(rpcUrl);
  const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();

  // The authority is both fee payer and the `authority` signer account, so one
  // fee-payer signature covers the instruction's required signature.
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(authority, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
    (m) => appendTransactionMessageInstructions([ix], m),
  );

  const signed = await signTransactionMessageWithSigners(message);
  const signature = getSignatureFromTransaction(signed);

  await rpc
    .sendTransaction(getBase64EncodedWireTransaction(signed), {
      encoding: "base64",
      preflightCommitment: "confirmed",
    })
    .send();

  console.log(JSON.stringify({ wagerRound, vault, signature, settlementAuthority }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
