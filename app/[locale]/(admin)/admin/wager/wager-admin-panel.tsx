"use client";

import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

interface WagerGroup {
  id: string;
  name: string;
  competitionId: string;
  rounds: Array<{ id: string; label: string }>;
}

interface WagerAdminPanelProps {
  groups: WagerGroup[];
  flagsLive: boolean;
}

type AsyncState = "idle" | "loading" | "success" | "error";

interface ConfigureResult {
  configId: string;
  decimals: number;
  tokenProgram: string;
}

interface InitializeResult {
  wagerRound: string;
  vault: string;
  signature?: string;
  alreadyInitialized: boolean;
  confirmed?: boolean;
}

interface StatusResult {
  configEnabled: boolean;
  wagerRoundExists: boolean;
  vaultExists: boolean;
  closesAt?: string;
  stakeDisplay?: string;
}

// Ties together the three admin wager API routes (configure / initialize /
// status) behind one panel. Fetch + loading/error state mirrors
// components/wallet/wallet-link-button.tsx.
export function WagerAdminPanel({ groups, flagsLive }: WagerAdminPanelProps) {
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const selectedGroup = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);

  const [mint, setMint] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");
  const [configureState, setConfigureState] = useState<AsyncState>("idle");
  const [configureError, setConfigureError] = useState<string | null>(null);
  const [configureResult, setConfigureResult] = useState<ConfigureResult | null>(null);

  const [roundId, setRoundId] = useState(groups[0]?.rounds[0]?.id ?? "");
  const [initState, setInitState] = useState<AsyncState>("idle");
  const [initError, setInitError] = useState<string | null>(null);
  const [initResult, setInitResult] = useState<InitializeResult | null>(null);

  const [statusState, setStatusState] = useState<AsyncState>("idle");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusResult, setStatusResult] = useState<StatusResult | null>(null);

  const resetResults = () => {
    setConfigureState("idle");
    setConfigureError(null);
    setConfigureResult(null);
    setInitState("idle");
    setInitError(null);
    setInitResult(null);
    setStatusState("idle");
    setStatusError(null);
    setStatusResult(null);
  };

  const handleGroupChange = (value: string) => {
    setGroupId(value);
    const next = groups.find((g) => g.id === value);
    setRoundId(next?.rounds[0]?.id ?? "");
    resetResults();
  };

  const handleConfigure = async () => {
    if (!groupId || !mint || !stakeAmount) return;
    setConfigureState("loading");
    setConfigureError(null);
    setConfigureResult(null);
    try {
      const resp = await fetch("/api/admin/wager/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, mint, stakeAmount }),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        setConfigureError(data.error ?? "Configuration failed");
        setConfigureState("error");
        return;
      }
      setConfigureResult({
        configId: data.configId,
        decimals: data.decimals,
        tokenProgram: data.tokenProgram,
      });
      setConfigureState("success");
    } catch (err) {
      setConfigureError(err instanceof Error ? err.message : "Configuration failed");
      setConfigureState("error");
    }
  };

  const handleInitialize = async () => {
    if (!groupId || !roundId) return;
    setInitState("loading");
    setInitError(null);
    setInitResult(null);
    try {
      const resp = await fetch("/api/admin/wager/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, roundId }),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        setInitError(data.error ?? "Initialization failed");
        setInitState("error");
        return;
      }
      setInitResult({
        wagerRound: data.wagerRound,
        vault: data.vault,
        signature: data.signature,
        alreadyInitialized: !!data.alreadyInitialized,
        confirmed: data.confirmed,
      });
      setInitState("success");
    } catch (err) {
      setInitError(err instanceof Error ? err.message : "Initialization failed");
      setInitState("error");
    }
  };

  const handleRefreshStatus = async () => {
    if (!groupId || !roundId) return;
    setStatusState("loading");
    setStatusError(null);
    try {
      const resp = await fetch(
        `/api/admin/wager/status?group=${encodeURIComponent(groupId)}&round=${encodeURIComponent(roundId)}`,
      );
      const data = await resp.json();
      if (!resp.ok || data.error) {
        setStatusError(data.error ?? "Failed to load status");
        setStatusState("error");
        return;
      }
      setStatusResult(data);
      setStatusState("success");
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Failed to load status");
      setStatusState("error");
    }
  };

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No groups exist yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {!flagsLive ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertCircleIcon className="size-5 shrink-0 text-amber-500" />
            <p className="text-sm text-muted-foreground">
              Wagering UI and deposits are disabled by feature flag. Configuration and on-chain
              initialization below still work, but the player-facing deposit path is not live yet.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Group</CardTitle>
        </CardHeader>
        <CardContent>
          <NativeSelect
            value={groupId}
            onChange={(e) => handleGroupChange(e.target.value)}
            aria-label="Group"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </NativeSelect>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configure wagering</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mint">Mint address</Label>
              <Input
                id="mint"
                value={mint}
                onChange={(e) => setMint(e.target.value)}
                placeholder="Devnet SPL mint address"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stakeAmount">Stake amount</Label>
              <Input
                id="stakeAmount"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder="e.g. 10"
              />
            </div>
          </div>
          <Button onClick={handleConfigure} disabled={configureState === "loading"}>
            {configureState === "loading" ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Configure wagering
          </Button>
          {configureState === "error" && configureError ? (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircleIcon className="size-4 shrink-0" />
              {configureError}
            </p>
          ) : null}
          {configureState === "success" && configureResult ? (
            <p className="flex items-center gap-2 text-sm text-pitch">
              <CheckCircle2Icon className="size-4 shrink-0" />
              Configured. Decimals: {configureResult.decimals}, token program:{" "}
              <span className="font-mono text-xs">{configureResult.tokenProgram}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Initialize round</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="round">Round</Label>
            <NativeSelect
              id="round"
              value={roundId}
              onChange={(e) => setRoundId(e.target.value)}
              disabled={!selectedGroup?.rounds.length}
            >
              {!selectedGroup?.rounds.length ? <option value="">No rounds</option> : null}
              {selectedGroup?.rounds.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button onClick={handleInitialize} disabled={initState === "loading" || !roundId}>
            {initState === "loading" ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Initialize round
          </Button>
          {initState === "error" && initError ? (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircleIcon className="size-4 shrink-0" />
              {initError}
            </p>
          ) : null}
          {initState === "success" && initResult ? (
            <div className="space-y-1 text-sm text-pitch">
              <p className="flex items-center gap-2">
                <CheckCircle2Icon className="size-4 shrink-0" />
                {initResult.alreadyInitialized
                  ? "Round was already initialized."
                  : initResult.confirmed === false
                    ? "Transaction submitted, not yet confirmed — refresh status to verify the vault."
                    : "Round initialized and confirmed on-chain."}
              </p>
              {initResult.signature ? (
                <a
                  href={`https://explorer.solana.com/tx/${initResult.signature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-muted-foreground underline"
                >
                  View transaction on Solana Explorer
                </a>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            onClick={handleRefreshStatus}
            disabled={statusState === "loading" || !roundId}
          >
            {statusState === "loading" ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Refresh status
          </Button>
          {statusState === "error" && statusError ? (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircleIcon className="size-4 shrink-0" />
              {statusError}
            </p>
          ) : null}
          {statusState === "success" && statusResult ? (
            <ul className="space-y-1 text-sm">
              <li className="flex items-center gap-2">
                {statusResult.configEnabled ? (
                  <CheckCircle2Icon className="size-4 shrink-0 text-pitch" />
                ) : (
                  <AlertCircleIcon className="size-4 shrink-0 text-muted-foreground" />
                )}
                Config enabled: {statusResult.configEnabled ? "yes" : "no"}
              </li>
              <li className="flex items-center gap-2">
                {statusResult.wagerRoundExists ? (
                  <CheckCircle2Icon className="size-4 shrink-0 text-pitch" />
                ) : (
                  <AlertCircleIcon className="size-4 shrink-0 text-muted-foreground" />
                )}
                Round row exists: {statusResult.wagerRoundExists ? "yes" : "no"}
              </li>
              <li className="flex items-center gap-2">
                {statusResult.vaultExists ? (
                  <CheckCircle2Icon className="size-4 shrink-0 text-pitch" />
                ) : (
                  <AlertCircleIcon className="size-4 shrink-0 text-muted-foreground" />
                )}
                Vault on-chain: {statusResult.vaultExists ? "yes" : "no"}
              </li>
              {statusResult.stakeDisplay ? <li>Stake: {statusResult.stakeDisplay}</li> : null}
              {statusResult.closesAt ? (
                <li>Closes at: {new Date(statusResult.closesAt).toLocaleString()}</li>
              ) : null}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
