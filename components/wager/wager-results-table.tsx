"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrophyIcon,
  MedalIcon,
  CheckCircle2Icon,
  ClockIcon,
  XCircleIcon,
  ExternalLinkIcon,
} from "lucide-react";

interface WagerResultEntry {
  rank: number;
  displayName: string;
  points: number;
  exactHits: number;
  winnerGdHits: number;
  winnerHits: number;
  award: string;
  tokenSymbol: string;
  claimState: "pending" | "claimed" | "refunded" | "not_winner";
  claimSignature?: string;
}

interface Props {
  entries: WagerResultEntry[];
  manifestHash?: string;
  settlementSignature?: string;
  totalPot: string;
  tokenSymbol: string;
}

export function WagerResultsTable({
  entries,
  manifestHash,
  settlementSignature,
  totalPot,
  tokenSymbol,
}: Props) {
  const winners = entries.filter((e) => e.award !== "0");

  const claimBadge = (state: WagerResultEntry["claimState"]) => {
    const variants: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pending", icon: <ClockIcon className="size-3" />, variant: "secondary" },
      claimed: { label: "Claimed", icon: <CheckCircle2Icon className="size-3" />, variant: "default" },
      refunded: { label: "Refunded", icon: <XCircleIcon className="size-3" />, variant: "destructive" },
      not_winner: { label: "—", icon: null, variant: "outline" },
    };
    const v = variants[state];
    return (
      <Badge variant={v.variant} className="text-[10px] inline-flex items-center gap-1">
        {v.icon}
        {v.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrophyIcon className="size-4 text-flag" />
          Results
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            Pot: {totalPot} {tokenSymbol}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Evidence */}
        {(manifestHash || settlementSignature) && (
          <div className="space-y-1 rounded-lg bg-muted/30 p-3 text-xs">
            <p className="font-medium text-muted-foreground">Settlement Evidence</p>
            {manifestHash && (
              <p className="font-mono text-muted-foreground">
                Manifest: {manifestHash.slice(0, 12)}...
              </p>
            )}
            {settlementSignature && (
              <a
                href={`https://explorer.solana.com/tx/${settlementSignature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-pitch hover:underline"
              >
                Settlement tx{" "}
                <ExternalLinkIcon className="size-3" />
              </a>
            )}
          </div>
        )}

        {/* Winners summary */}
        {winners.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-flag/10 p-3">
            <MedalIcon className="size-5 text-flag" />
            <div>
              <p className="text-sm font-medium">
                {winners.length} winner{winners.length > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {winners.map((w) => `${w.displayName}: ${w.award} ${tokenSymbol}`).join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="space-y-1">
          {entries.map((entry) => (
            <div
              key={entry.displayName}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 text-center font-mono text-xs text-muted-foreground">
                  {entry.rank <= 3 ? (
                    <MedalIcon
                      className={`size-4 inline ${
                        entry.rank === 1
                          ? "text-flag"
                          : entry.rank === 2
                            ? "text-muted-foreground"
                            : "text-amber-700"
                      }`}
                    />
                  ) : (
                    `#${entry.rank}`
                  )}
                </span>
                <span className="font-medium truncate">{entry.displayName}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-xs tabular-nums">
                  {entry.points} pts
                </span>
                <span className="hidden sm:inline text-xs text-muted-foreground">
                  {entry.exactHits}E {entry.winnerGdHits}G {entry.winnerHits}W
                </span>
                {entry.award !== "0" && (
                  <span className="font-mono text-xs font-medium">
                    {entry.award} {tokenSymbol}
                  </span>
                )}
                {entry.award === "0" && entry.claimState !== "not_winner" && (
                  <span className="font-mono text-xs text-muted-foreground">
                    Refunded
                  </span>
                )}
                {claimBadge(entry.claimState)}
              </div>
            </div>
          ))}
        </div>

        {/* Oracle trust disclosure */}
        <p className="text-center text-[11px] text-muted-foreground">
          Results settled by the Winscore oracle on Solana Devnet. Devnet
          tokens have no real value. The settlement manifest is immutable and
          published on-chain.
        </p>
      </CardContent>
    </Card>
  );
}
