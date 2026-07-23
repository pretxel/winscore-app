/**
 * Structured logging and metrics for wager operations.
 * Correlated by intent/signature/pool/round identifiers.
 * Excludes secrets, signed-message bodies, and unnecessary personal data.
 */

export type WagerMetric =
  | "intent_created"
  | "intent_expired"
  | "signature_rejected"
  | "transaction_submitted"
  | "transaction_confirmed"
  | "transaction_failed"
  | "rpc_latency"
  | "rpc_error"
  | "reconciliation_mismatch"
  | "round_locked"
  | "round_settled"
  | "round_cancelled"
  | "claim_processed"
  | "refund_processed"
  | "aged_liability";

export interface WagerLogEntry {
  metric: WagerMetric;
  intentId?: string;
  signature?: string;
  groupId?: string;
  roundId?: string;
  durationMs?: number;
  error?: string;
  timestamp: string;
}

const logBuffer: WagerLogEntry[] = [];
const MAX_BUFFER = 100;

function flushLogs() {
  if (logBuffer.length === 0) return;
  // In production: send to structured logging service (e.g., Vercel Logs, Datadog, etc.)
  for (const entry of logBuffer) {
    const msg = Object.entries(entry)
      .filter(([, v]) => v != null)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ");
    console.log(`[wager] ${entry.metric}: ${msg}`);
  }
  logBuffer.length = 0;
}

export function logWagerEvent(entry: Omit<WagerLogEntry, "timestamp">): void {
  logBuffer.push({ ...entry, timestamp: new Date().toISOString() });
  if (logBuffer.length >= MAX_BUFFER) flushLogs();
}

export function recordRpcLatency(durationMs: number): void {
  logWagerEvent({ metric: "rpc_latency", durationMs });
}

export function recordRpcError(error: string): void {
  logWagerEvent({ metric: "rpc_error", error });
}

export function recordReconciliationMismatch(intentId: string, error: string): void {
  logWagerEvent({
    metric: "reconciliation_mismatch",
    intentId,
    error,
  });
}

export function recordAgedLiability(roundId: string, daysUnclaimed: number): void {
  logWagerEvent({
    metric: "aged_liability",
    roundId,
    error: `${daysUnclaimed} days unclaimed`,
  });
}

// Flush periodically
setInterval(flushLogs, 30_000).unref();
