/**
 * Sign, send, and confirm a server-authority transaction.
 *
 * Shared by every server-side on-chain write (initialize, lock, settle) so the
 * confirmation and idempotency posture is identical across them: send once, then
 * poll the signature status rather than assuming success. Callers that must not
 * double-send are expected to check on-chain state first — a send that times out
 * here may still land.
 */

import {
  appendTransactionMessageInstructions,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  type Instruction,
  type KeyPairSigner,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import { getWagerEnv } from "./env";

const POLL_ATTEMPTS = 8;
const POLL_INTERVAL_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface SendResult {
  signature: string;
  /** False when the send succeeded but the status did not confirm in the poll window. */
  confirmed: boolean;
}

/**
 * @param feePayer Signs and pays. Any additional required signers must already be
 * attached to the instructions.
 */
export async function sendAndConfirmInstructions(
  instructions: Instruction[],
  feePayer: KeyPairSigner,
): Promise<SendResult> {
  const rpc = createSolanaRpc(getWagerEnv().rpcUrl);
  const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();

  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(feePayer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
    (m) => appendTransactionMessageInstructions(instructions, m),
  );

  const signed = await signTransactionMessageWithSigners(message);
  const signature = getSignatureFromTransaction(signed);

  await rpc
    .sendTransaction(getBase64EncodedWireTransaction(signed), {
      encoding: "base64",
      preflightCommitment: "confirmed",
    })
    .send();

  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
    const { value } = await rpc
      .getSignatureStatuses([signature], { searchTransactionHistory: true })
      .send();
    const status = value[0];

    if (status) {
      if (status.err) {
        throw new Error(`Transaction ${signature} failed on-chain`);
      }
      if (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized") {
        return { signature, confirmed: true };
      }
    }

    if (attempt < POLL_ATTEMPTS - 1) await sleep(POLL_INTERVAL_MS);
  }

  return { signature, confirmed: false };
}
