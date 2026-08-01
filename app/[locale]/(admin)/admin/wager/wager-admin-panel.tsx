"use client";

import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
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
  wagerRoundId?: string;
  state?: string;
}

interface SettleReadiness {
  ready: boolean;
  reason?: string;
}

interface SettleResult {
  signature?: string;
  winnerCount?: number;
  totalDistributable?: string;
}

// Ties together the three admin wager API routes (configure / initialize /
// status) behind one panel. Fetch + loading/error state mirrors
// components/wallet/wallet-link-button.tsx.
export function WagerAdminPanel({ groups, flagsLive }: WagerAdminPanelProps) {
  const t = useTranslations("admin.wager");
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

  const [readinessState, setReadinessState] = useState<AsyncState>("idle");
  const [readiness, setReadiness] = useState<SettleReadiness | null>(null);
  const [settleState, setSettleState] = useState<AsyncState>("idle");
  const [settleError, setSettleError] = useState<string | null>(null);
  const [settleResult, setSettleResult] = useState<SettleResult | null>(null);
  const [settleConfirming, setSettleConfirming] = useState(false);

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
    setReadinessState("idle");
    setReadiness(null);
    setSettleState("idle");
    setSettleError(null);
    setSettleResult(null);
    setSettleConfirming(false);
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
        setConfigureError(data.error ?? t("configureFailed"));
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
      setConfigureError(err instanceof Error ? err.message : t("configureFailed"));
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
        setInitError(data.error ?? t("initFailed"));
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
      setInitError(err instanceof Error ? err.message : t("initFailed"));
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
        setStatusError(data.error ?? t("statusFailed"));
        setStatusState("error");
        return;
      }
      setStatusResult(data);
      setStatusState("success");
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : t("statusFailed"));
      setStatusState("error");
    }
  };

  /**
   * Ask the server whether the round can be settled. Read-only on purpose: the
   * blockers (fixtures not final, correction delay, round still open) are shown
   * before offering the irreversible on-chain write.
   */
  const handleCheckReadiness = async () => {
    const wagerRoundId = statusResult?.wagerRoundId;
    if (!wagerRoundId) return;
    setReadinessState("loading");
    setReadiness(null);
    setSettleConfirming(false);
    try {
      const resp = await fetch(
        `/api/admin/wager/settle?wagerRoundId=${encodeURIComponent(wagerRoundId)}`,
      );
      const data = await resp.json();
      if (!resp.ok || data.error) {
        setReadiness({ ready: false, reason: data.error ?? t("settleFailed") });
        setReadinessState("error");
        return;
      }
      setReadiness({ ready: !!data.ready, reason: data.reason });
      setReadinessState("success");
    } catch (err) {
      setReadiness({
        ready: false,
        reason: err instanceof Error ? err.message : t("settleFailed"),
      });
      setReadinessState("error");
    }
  };

  const handleSettle = async () => {
    const wagerRoundId = statusResult?.wagerRoundId;
    if (!wagerRoundId) return;
    setSettleState("loading");
    setSettleError(null);
    setSettleResult(null);
    try {
      const resp = await fetch("/api/admin/wager/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wagerRoundId }),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        setSettleError(data.error ?? t("settleFailed"));
        setSettleState("error");
        return;
      }
      setSettleResult({
        signature: data.signature,
        winnerCount: data.winnerCount,
        totalDistributable: data.totalDistributable?.toString(),
      });
      setSettleState("success");
      setSettleConfirming(false);
      // The round has moved to settled — pull fresh status so the panel agrees.
      await handleRefreshStatus();
    } catch (err) {
      setSettleError(err instanceof Error ? err.message : t("settleFailed"));
      setSettleState("error");
    }
  };

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {t("noGroups")}
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
            <p className="text-sm text-muted-foreground">{t("flagsOff")}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("group")}</CardTitle>
        </CardHeader>
        <CardContent>
          <NativeSelect
            value={groupId}
            onChange={(e) => handleGroupChange(e.target.value)}
            aria-label={t("group")}
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
          <CardTitle>{t("configureTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mint">{t("mintLabel")}</Label>
              <Input
                id="mint"
                value={mint}
                onChange={(e) => setMint(e.target.value)}
                placeholder={t("mintPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stakeAmount">{t("stakeLabel")}</Label>
              <Input
                id="stakeAmount"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder={t("stakePlaceholder")}
              />
            </div>
          </div>
          <Button onClick={handleConfigure} disabled={configureState === "loading"}>
            {configureState === "loading" ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {t("configureAction")}
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
              {t("configureSuccess", { decimals: configureResult.decimals })}{" "}
              <span className="font-mono text-xs">{configureResult.tokenProgram}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("initTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="round">{t("roundLabel")}</Label>
            <NativeSelect
              id="round"
              value={roundId}
              onChange={(e) => setRoundId(e.target.value)}
              disabled={!selectedGroup?.rounds.length}
            >
              {!selectedGroup?.rounds.length ? <option value="">{t("noRounds")}</option> : null}
              {selectedGroup?.rounds.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button onClick={handleInitialize} disabled={initState === "loading" || !roundId}>
            {initState === "loading" ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {t("initAction")}
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
                  ? t("initAlready")
                  : initResult.confirmed === false
                    ? t("initUnconfirmed")
                    : t("initConfirmed")}
              </p>
              {initResult.signature ? (
                <a
                  href={`https://explorer.solana.com/tx/${initResult.signature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-muted-foreground underline"
                >
                  {t("viewTransaction")}
                </a>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("statusTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            onClick={handleRefreshStatus}
            disabled={statusState === "loading" || !roundId}
          >
            {statusState === "loading" ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {t("statusRefresh")}
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
                {t("statusConfigEnabled")}: {statusResult.configEnabled ? t("yes") : t("no")}
              </li>
              <li className="flex items-center gap-2">
                {statusResult.wagerRoundExists ? (
                  <CheckCircle2Icon className="size-4 shrink-0 text-pitch" />
                ) : (
                  <AlertCircleIcon className="size-4 shrink-0 text-muted-foreground" />
                )}
                {t("statusRoundExists")}: {statusResult.wagerRoundExists ? t("yes") : t("no")}
              </li>
              <li className="flex items-center gap-2">
                {statusResult.vaultExists ? (
                  <CheckCircle2Icon className="size-4 shrink-0 text-pitch" />
                ) : (
                  <AlertCircleIcon className="size-4 shrink-0 text-muted-foreground" />
                )}
                {t("statusVaultExists")}: {statusResult.vaultExists ? t("yes") : t("no")}
              </li>
              {statusResult.stakeDisplay ? (
                <li>
                  {t("statusStake")}: {statusResult.stakeDisplay}
                </li>
              ) : null}
              {statusResult.closesAt ? (
                <li>
                  {t("statusClosesAt")}: {new Date(statusResult.closesAt).toLocaleString()}
                </li>
              ) : null}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      {/* Settle — only reachable once status has resolved the round, so the
          panel always knows which round id it would be settling. */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settleTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("settleDescription")}</p>

          {!statusResult?.wagerRoundId ? (
            <p className="text-sm text-muted-foreground">{t("settleNeedsStatus")}</p>
          ) : statusResult.state === "settled" ? (
            <p className="flex items-center gap-2 text-sm text-pitch">
              <CheckCircle2Icon className="size-4 shrink-0" />
              {t("settleAlready")}
            </p>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCheckReadiness}
                disabled={readinessState === "loading"}
              >
                {readinessState === "loading" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : null}
                {t("settleCheck")}
              </Button>

              {readiness && !readiness.ready ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircleIcon className="size-4 shrink-0 text-amber-500" />
                  {readiness.reason ?? t("settleNotReady")}
                </p>
              ) : null}

              {readiness?.ready && !settleConfirming && settleState !== "success" ? (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-sm text-pitch">
                    <CheckCircle2Icon className="size-4 shrink-0" />
                    {t("settleReady")}
                  </p>
                  <Button variant="outline" onClick={() => setSettleConfirming(true)}>
                    {t("settleAction")}
                  </Button>
                </div>
              ) : null}

              {settleConfirming ? (
                <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                  <p className="flex items-start gap-2 text-sm">
                    <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-amber-500" />
                    {t("settleWarning")}
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={handleSettle} disabled={settleState === "loading"}>
                      {settleState === "loading" ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : null}
                      {t("settleConfirm")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSettleConfirming(false)}
                      disabled={settleState === "loading"}
                    >
                      {t("settleCancel")}
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {settleState === "error" && settleError ? (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircleIcon className="size-4 shrink-0" />
              {settleError}
            </p>
          ) : null}

          {settleState === "success" && settleResult ? (
            <div className="space-y-1 text-sm text-pitch">
              <p className="flex items-center gap-2">
                <CheckCircle2Icon className="size-4 shrink-0" />
                {t("settleDone", { winners: settleResult.winnerCount ?? 0 })}
              </p>
              {settleResult.signature ? (
                <a
                  href={`https://explorer.solana.com/tx/${settleResult.signature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-muted-foreground underline"
                >
                  {t("viewTransaction")}
                </a>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
