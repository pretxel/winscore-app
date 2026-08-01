"use client";

import { getBase58Decoder } from "@solana/kit";
import { useConnect, useWallets } from "@solana/kit-plugin-wallet/react";
import { useSignAndSendTransaction } from "@solana/react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CoinsIcon,
  ExternalLinkIcon,
  Loader2Icon,
  RotateCcwIcon,
  TrophyIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// The UiWalletAccount shape accepted by useSignAndSendTransaction.
type WalletAccount = Parameters<typeof useSignAndSendTransaction>[0];

type PayoutKind = "claim" | "refund";
type PayoutView = "idle" | "signing" | "done" | "failed";

interface SignPayoutButtonProps {
  account: WalletAccount;
  kind: PayoutKind;
  /** Settlement id for a claim, wager round id for a refund. */
  targetId: string;
  label: string;
  loading: boolean;
  onSigning: () => void;
  onDone: (signature: string) => void;
  onError: (message: string) => void;
}

/**
 * Runs prepare -> wallet sign+send -> confirm for both payout paths. Isolated in
 * its own component so useSignAndSendTransaction can bind to the connected
 * account, mirroring ConfirmDepositButton in the wager rail.
 */
function SignPayoutButton({
  account,
  kind,
  targetId,
  label,
  loading,
  onSigning,
  onDone,
  onError,
}: SignPayoutButtonProps) {
  const signAndSend = useSignAndSendTransaction(account, "solana:devnet");

  const handleSign = useCallback(async () => {
    onSigning();
    try {
      const prepareBody =
        kind === "claim" ? { settlementId: targetId } : { wagerRoundId: targetId };
      const prepResp = await fetch(`/api/wager/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prepareBody),
      });
      const prep = await prepResp.json();
      if (!prepResp.ok) throw new Error(prep.error ?? `Failed to prepare ${kind}`);

      const txBytes = Uint8Array.from(atob(prep.transactionBase64), (c) => c.charCodeAt(0));
      const { signature } = await signAndSend({ transaction: txBytes });
      const signatureBase58 = getBase58Decoder().decode(signature);

      // The on-chain PDA is authoritative, so a lost confirm call cannot strand
      // funds — it only leaves the mirrored row behind until it is retried.
      const confirmBody =
        kind === "claim"
          ? { claimId: prep.claimId, signature: signatureBase58 }
          : { entryId: prep.entryId };
      const confirmResp = await fetch(`/api/wager/${kind}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(confirmBody),
      });
      const confirmed = await confirmResp.json();
      if (!confirmResp.ok) {
        throw new Error(confirmed.error ?? `Failed to record the ${kind}`);
      }
      onDone(signatureBase58);
    } catch (err) {
      onError(err instanceof Error ? err.message : `${kind} failed`);
    }
  }, [kind, targetId, signAndSend, onSigning, onDone, onError]);

  return (
    <Button size="sm" onClick={handleSign} disabled={loading}>
      {loading ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

export interface WagerPayoutProps {
  kind: PayoutKind;
  /** Settlement id for a claim, wager round id for a refund. */
  targetId: string;
  /** Award (claim) or stake (refund), already scaled for display. */
  amountDisplay: string;
  tokenSymbol?: string;
  /** Set once the payout already landed, so the card renders its terminal state. */
  alreadySettled?: boolean;
  existingSignature?: string;
}

/**
 * Lets a winner withdraw an award, or an entrant pull a stake back out of a
 * cancelled round. Both are non-custodial: the server only prepares the
 * transaction and the entrant's own wallet signs it.
 */
export function WagerPayout({
  kind,
  targetId,
  amountDisplay,
  tokenSymbol = "TOKEN",
  alreadySettled = false,
  existingSignature,
}: WagerPayoutProps) {
  const [view, setView] = useState<PayoutView>(alreadySettled ? "done" : "idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(existingSignature ?? null);
  const [account, setAccount] = useState<WalletAccount | null>(null);

  const router = useRouter();
  const wallets = useWallets();
  const connect = useConnect();

  const isClaim = kind === "claim";
  const title = isClaim ? "Claim Your Award" : "Refund Available";

  const handleConnect = useCallback(async () => {
    setError(null);
    if (account) return;
    const wallet = wallets[0];
    if (!wallet) {
      setError("No Solana wallet found. Install Phantom or Solflare.");
      setView("failed");
      return;
    }
    try {
      const accounts = await connect.dispatchAsync(wallet);
      setAccount((accounts[0] as unknown as WalletAccount) ?? null);
    } catch {
      setError("Could not connect your wallet.");
      setView("failed");
    }
  }, [account, wallets, connect]);

  const handleDone = useCallback(
    (sig: string) => {
      setSignature(sig);
      setView("done");
      setLoading(false);
      router.refresh();
    },
    [router],
  );

  const handleError = useCallback((msg: string) => {
    if (msg.includes("rejected") || msg.includes("denied") || msg.includes("User rejected")) {
      setError("Transaction was rejected in your wallet.");
    } else if (msg.includes("Blockhash") || msg.includes("expired")) {
      setError("Transaction expired. Please try again.");
    } else if (msg.includes("Already claimed") || msg.includes("Already refunded")) {
      // The chain already has it; the row just had not caught up.
      setView("done");
      setLoading(false);
      return;
    } else {
      setError(msg);
    }
    setView("failed");
    setLoading(false);
  }, []);

  if (view === "done") {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2Icon className="size-4 text-emerald-500" />
            {isClaim ? "Award Claimed" : "Stake Refunded"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {amountDisplay} {tokenSymbol}{" "}
            {isClaim ? "sent to your wallet." : "returned to your wallet."}
          </p>
          {signature ? (
            <a
              href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLinkIcon className="size-3" />
              Explorer
            </a>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (view === "failed") {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangleIcon className="size-4 text-destructive" />
            {isClaim ? "Claim Failed" : "Refund Failed"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground">
            Your funds are still in the escrow program. You can try again.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setView("idle");
              setError(null);
            }}
          >
            <RotateCcwIcon className="mr-2 size-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={
        isClaim ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"
      }
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {isClaim ? (
            <TrophyIcon className="size-4 text-emerald-500" />
          ) : (
            <CoinsIcon className="size-4 text-amber-500" />
          )}
          {title}
          <Badge variant="outline" className="ml-auto text-xs">
            Devnet
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold">{amountDisplay}</span>
          <span className="text-sm text-muted-foreground">{tokenSymbol}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {isClaim
            ? "You placed first in this round. Sign to transfer your award from escrow to your wallet."
            : "This round was cancelled. Sign to pull your stake back out of escrow."}
        </p>

        {account ? (
          <SignPayoutButton
            account={account}
            kind={kind}
            targetId={targetId}
            label={isClaim ? "Claim Award" : "Refund Stake"}
            loading={loading}
            onSigning={() => {
              setLoading(true);
              setView("signing");
            }}
            onDone={handleDone}
            onError={handleError}
          />
        ) : (
          <Button size="sm" onClick={handleConnect}>
            Connect Wallet
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
