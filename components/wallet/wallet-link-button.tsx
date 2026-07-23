"use client";

import { useConnect, useSignMessage, useWallets } from "@solana/kit-plugin-wallet/react";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  Loader2Icon,
  UnlinkIcon,
  WalletIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type LinkState = "idle" | "connecting" | "linked" | "unlinking" | "error";

interface WalletLinkButtonProps {
  initialWalletAddress?: string;
  initialLinkId?: string;
  initialCluster?: string;
  /** Invoked after a wallet is successfully linked. */
  onLinked?: () => void;
}

export function WalletLinkButton({
  initialWalletAddress,
  initialLinkId,
  initialCluster,
  onLinked,
}: WalletLinkButtonProps = {}) {
  const [state, setState] = useState<LinkState>(initialWalletAddress ? "linked" : "idle");
  const [walletAddress, setWalletAddress] = useState<string | null>(initialWalletAddress ?? null);
  const [linkId, setLinkId] = useState<string | null>(initialLinkId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [cluster, setCluster] = useState<string | undefined>(initialCluster);

  const wallets = useWallets();
  const connect = useConnect();
  const signMessage = useSignMessage();

  const handleLink = useCallback(async () => {
    const wallet = wallets[0];
    if (!wallet) {
      setError("No Solana wallet found. Install Phantom or Solflare.");
      setState("error");
      return;
    }

    setState("connecting");
    setError(null);

    try {
      const accounts = await connect.dispatchAsync(wallet);
      const account = accounts[0];
      const addr = account.address;

      const challengeResp = await fetch("/api/wallet/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: addr }),
      });

      if (!challengeResp.ok) {
        const data = await challengeResp.json();
        setError(data.error ?? "Failed to create challenge");
        setState("error");
        return;
      }

      const { challengeId, message } = await challengeResp.json();

      const sig = await signMessage.dispatchAsync(new TextEncoder().encode(message));

      const verifyResp = await fetch("/api/wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId,
          signature: Array.from(sig),
          walletAddress: addr,
        }),
      });

      if (!verifyResp.ok) {
        const data = await verifyResp.json();
        setError(data.error ?? "Verification failed");
        setState("error");
        return;
      }

      const { linkId: newLinkId } = await verifyResp.json();
      setWalletAddress(addr);
      setLinkId(newLinkId);
      setCluster("devnet");
      setState("linked");
      onLinked?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setState("error");
    }
  }, [wallets, connect, signMessage, onLinked]);

  const handleUnlink = useCallback(async () => {
    if (!linkId) return;
    setState("unlinking");
    setError(null);

    try {
      const resp = await fetch("/api/wallet/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error ?? "Unlink failed");
        setState("linked");
        return;
      }

      setWalletAddress(null);
      setLinkId(null);
      setCluster(undefined);
      setState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unlink failed");
      setState("linked");
    }
  }, [linkId]);

  if (state === "error") {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex items-center gap-3 py-3">
          <AlertCircleIcon className="size-5 text-destructive shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Wallet Error</p>
            <p className="text-xs text-muted-foreground truncate">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setState("idle");
              setError(null);
            }}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (walletAddress && (state === "linked" || state === "unlinking")) {
    const isUnlinking = state === "unlinking";
    return (
      <Card className="border-pitch/30 bg-pitch/5">
        <CardContent className="flex items-center gap-3 py-3">
          <CheckCircle2Icon className="size-5 text-pitch shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Wallet Linked</p>
            <p className="text-xs text-muted-foreground font-mono truncate">
              {walletAddress.slice(0, 8)}...{walletAddress.slice(-4)}
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-500">
            {cluster || "Devnet"}
          </Badge>
          <Button variant="ghost" size="sm" onClick={handleUnlink} disabled={isUnlinking}>
            {isUnlinking ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <UnlinkIcon className="size-4" />
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isLoading = state === "connecting";

  return (
    <Button onClick={handleLink} disabled={isLoading} variant="outline" size="sm" className="gap-2">
      {isLoading ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <WalletIcon className="size-4" />
      )}
      {isLoading ? "Connecting…" : "Link Wallet"}
    </Button>
  );
}
