"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CoinsIcon,
  ClockIcon,
  UsersIcon,
  ShieldCheckIcon,
  WalletIcon,
  Loader2Icon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
} from "lucide-react";

type WagerView = "overview" | "consent" | "confirming" | "confirmed" | "failed";

interface WagerRailProps {
  poolId: string;
  roundId: string;
  wagerAvailable: boolean;
  walletLinked: boolean;
  walletAddress?: string;
  tokenSymbol?: string;
  stakeDisplay?: string;
  potDisplay?: string;
  participantCount?: number;
  closesAt?: string;
  hasCompletePicks: boolean;
  eligibilityOk: boolean;
}

export function WagerRail({
  poolId,
  roundId,
  wagerAvailable,
  walletLinked,
  walletAddress,
  tokenSymbol = "TOKEN",
  stakeDisplay = "1",
  potDisplay = "0",
  participantCount = 0,
  closesAt,
  hasCompletePicks,
  eligibilityOk,
}: WagerRailProps) {
  const [view, setView] = useState<WagerView>("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const handleConsent = async () => {
    setView("consent");
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    setView("confirming");

    try {
      // 1. Create wager intent via Server Action (already handled by the matchday sheet)
      // 2. Prepare transaction
      const prepResp = await fetch("/api/wager/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentId: "placeholder" }),
      });

      if (!prepResp.ok) {
        throw new Error("Failed to prepare transaction");
      }

      // 3. Sign and submit via wallet (placeholder for Wallet Standard integration)
      // 4. Verify on-chain confirmation

      setView("confirmed");
      setTxSignature("mock-sig");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setView("failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setView("overview");
    setError(null);
  };

  if (!wagerAvailable) {
    return (
      <Card className="border-muted bg-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CoinsIcon className="size-4" />
            Matchday Wager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Wagering is not available for this round. Free picks are always on.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!hasCompletePicks) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex items-center gap-3 py-4">
          <AlertTriangleIcon className="size-5 text-amber-500 shrink-0" />
          <p className="text-sm">
            Complete all your free picks first, then the wager option will unlock.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!walletLinked) {
    return (
      <Card className="border-muted bg-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <WalletIcon className="size-4" />
            Matchday Wager
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Link a Solana wallet to enable wagering for this round.
          </p>
          <Button variant="outline" size="sm" className="gap-2">
            <WalletIcon className="size-4" />
            Link Wallet
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!eligibilityOk) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-center gap-3 py-4">
          <AlertTriangleIcon className="size-5 text-destructive shrink-0" />
          <p className="text-sm text-muted-foreground">
            Eligibility checks must pass before entering a wager. Check your profile settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  const closeDate = closesAt
    ? new Date(closesAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
    : "—";

  switch (view) {
    case "consent":
      return (
        <Card className="border-flag/30 bg-flag/5">
          <CardHeader>
            <CardTitle className="text-base">Confirm Your Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stake</span>
                <span className="font-medium">
                  {stakeDisplay} {tokenSymbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Closes</span>
                <span>{closeDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current pot</span>
                <span>
                  {potDisplay} {tokenSymbol}
                </span>
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">
                By confirming, your wallet will sign a transaction transferring
                exactly {stakeDisplay} {tokenSymbol} to the escrow program on{" "}
                <strong>Solana Devnet</strong>. Devnet tokens have no real
                value. Winscore is the settlement oracle. Rules are final.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView("overview")}
              >
                Back
              </Button>
              <Button size="sm" onClick={handleConfirm} disabled={loading}>
                {loading ? (
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                ) : null}
                I Understand — Sign Transaction
              </Button>
            </div>
          </CardContent>
        </Card>
      );

    case "confirming":
      return (
        <Card className="border-pitch/30 bg-pitch/5">
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <Loader2Icon className="size-8 animate-spin text-pitch" />
            <p className="text-sm font-medium">Awaiting signature…</p>
            <p className="text-xs text-muted-foreground">
              Confirm the transaction in your wallet.
            </p>
          </CardContent>
        </Card>
      );

    case "confirmed":
      return (
        <Card className="border-pitch/30 bg-pitch/5">
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center gap-2">
              <CheckCircle2Icon className="size-5 text-pitch" />
              <p className="text-sm font-medium">Entry Confirmed</p>
            </div>
            {txSignature && (
              <div className="flex items-center gap-2 text-xs">
                <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono">
                  {txSignature.slice(0, 12)}...{txSignature.slice(-4)}
                </code>
                <a
                  href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pitch hover:underline inline-flex items-center gap-1"
                >
                  Explorer <ExternalLinkIcon className="size-3" />
                </a>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Your {stakeDisplay} {tokenSymbol} has been deposited. Results
              will be settled after the round closes.
            </p>
          </CardContent>
        </Card>
      );

    case "failed":
      return (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon className="size-5 text-destructive" />
              <p className="text-sm font-medium">Entry Failed</p>
            </div>
            {error && (
              <p className="text-xs text-muted-foreground">{error}</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRetry}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      );

    default: // overview
      return (
        <Card className="border-pitch/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CoinsIcon className="size-4 text-flag" />
              Matchday Wager
              <Badge
                variant="outline"
                className="ml-auto text-[10px] bg-blue-500/10 text-blue-500"
              >
                Devnet
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Stake</p>
                <p className="font-medium">
                  {stakeDisplay} {tokenSymbol}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Pot</p>
                <p className="font-medium">
                  {potDisplay} {tokenSymbol}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Participants</p>
                <p className="flex items-center gap-1 font-medium">
                  <UsersIcon className="size-3" />
                  {participantCount}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Closes</p>
                <p className="flex items-center gap-1 font-medium">
                  <ClockIcon className="size-3" />
                  {closeDate}
                </p>
              </div>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <p className="flex items-center gap-1">
                <WalletIcon className="size-3" />
                {walletAddress
                  ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}`
                  : "Wallet not linked"}
              </p>
              <p className="flex items-center gap-1">
                <ShieldCheckIcon className="size-3" />
                Winscore oracle · Immutable snapshot
              </p>
            </div>

            <Separator />

            <Button
              className="w-full"
              size="sm"
              onClick={handleConsent}
            >
              Enter Wager — {stakeDisplay} {tokenSymbol}
            </Button>
          </CardContent>
        </Card>
      );
  }
}
