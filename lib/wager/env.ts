import { env } from "@/lib/env";

/**
 * Validated, server-only wager environment configuration.
 * Devnet-only cluster enforcement. Lazy SDK init safe for next build.
 * Mainnet cluster/mint/program values fail closed.
 */

export interface WagerEnv {
  /** Solana cluster — only "devnet" is accepted in MVP */
  cluster: "devnet";
  /** Public Solana RPC endpoint */
  rpcUrl: string;
  /** Public websocket endpoint */
  wsUrl: string;
  /** Private RPC credentials (never exposed to client) */
  rpcApiKey: string | null;
  /** Wager program ID on the configured cluster */
  programId: string;
  /** Approved SPL mint address */
  approvedMint: string;
  /** Approved token program (classic SPL Token) */
  tokenProgram: string;
  /** Confirmation commitment level */
  commitment: "confirmed" | "finalized";
  /** Feature flags — all default false */
  uiEnabled: boolean;
  depositsEnabled: boolean;
  settlementEnabled: boolean;
}

function parseWagerEnv(): WagerEnv {
  const cluster = env.wagerCluster ?? "devnet";
  if (cluster !== "devnet") {
    throw new Error(
      `WAGER_CLUSTER must be "devnet" for MVP. Got: ${cluster}`
    );
  }

  return {
    cluster: cluster as "devnet",
    rpcUrl:
      env.wagerRpcUrl ?? "https://api.devnet.solana.com",
    wsUrl:
      env.wagerWsUrl ?? "wss://api.devnet.solana.com",
    rpcApiKey: env.wagerRpcApiKey ?? null,
    programId:
      env.wagerProgramId ??
      "9q5fBczvg3XYipRmxY5tt3axGgNQfYtGeaDpbMHMLkmi",
    approvedMint:
      env.wagerApprovedMint ?? "",
    tokenProgram:
      env.wagerTokenProgram ??
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    commitment: "confirmed",
    uiEnabled: env.wagerUiEnabled === "true",
    depositsEnabled: env.wagerDepositsEnabled === "true",
    settlementEnabled: env.wagerSettlementEnabled === "true",
  };
}

let _env: WagerEnv | null = null;

export function getWagerEnv(): WagerEnv {
  if (!_env) {
    _env = parseWagerEnv();
  }
  return _env;
}

export function isWagerUiEnabled(): boolean {
  return getWagerEnv().uiEnabled;
}

export function isWagerDepositsEnabled(): boolean {
  return getWagerEnv().depositsEnabled;
}

export function isWagerSettlementEnabled(): boolean {
  return getWagerEnv().settlementEnabled;
}
