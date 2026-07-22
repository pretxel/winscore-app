/**
 * Deterministic integer pot allocation for wager settlement.
 *
 * For N winners and pot P, each receives floor(P/N) base units.
 * The remainder (P mod N) is assigned one unit at a time to winners
 * ordered by their raw 32-byte wallet public key ascending.
 *
 * The sum of all awards always equals the total pot (no rounding loss).
 */

export interface WinnerAllocation {
  userId: string;
  walletPubkey: Uint8Array;
  awardBaseUnits: number;
}

/**
 * Allocate a total pot in integer base units among winners.
 * Each winner receives floor(pot / count).
 * The remainder is distributed one unit at a time in raw pubkey byte order.
 *
 * @param potTotalBaseUnits - Total pot in integer base units (must be non-negative)
 * @param winners - Array of winner entries with 32-byte wallet public keys
 * @returns Winners with their exact integer awards. Sum equals potTotalBaseUnits.
 */
export function allocatePot(
  potTotalBaseUnits: number,
  winners: { userId: string; walletPubkey: Uint8Array }[],
): WinnerAllocation[] {
  if (!Number.isInteger(potTotalBaseUnits) || potTotalBaseUnits < 0) {
    throw new Error("potTotalBaseUnits must be a non-negative integer");
  }

  const count = winners.length;
  if (count === 0) {
    return [];
  }

  const floor = Math.floor(potTotalBaseUnits / count);
  const remainder = potTotalBaseUnits % count;

  // Sort winners by raw pubkey bytes ascending for deterministic remainder distribution
  const sorted = [...winners].sort((a, b) => {
    for (let i = 0; i < 32; i++) {
      const diff = (a.walletPubkey[i] ?? 0) - (b.walletPubkey[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });

  return sorted.map((w, i) => ({
    userId: w.userId,
    walletPubkey: w.walletPubkey,
    awardBaseUnits: floor + (i < remainder ? 1 : 0),
  }));
}

/**
 * Verify pot conservation: sum of awards equals potTotalBaseUnits.
 */
export function verifyPotConservation(
  potTotalBaseUnits: number,
  allocations: WinnerAllocation[],
): boolean {
  const sum = allocations.reduce((acc, a) => acc + a.awardBaseUnits, 0);
  return sum === potTotalBaseUnits;
}
