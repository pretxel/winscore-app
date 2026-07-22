"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CoinsIcon, ClockIcon, UsersIcon } from "lucide-react";

interface WagerRoundCard {
  roundId: string;
  groupId: string;
  label: string;
  status: "initialized" | "locked" | "settled" | "cancelled" | "closed";
  closesAt: string;
  stakeDisplay: string;
  tokenSymbol: string;
  participantCount: number;
  potDisplay: string;
  hasUserEntry: boolean;
}

export function WagerRoundsList({
  rounds,
  locale,
  league,
}: {
  rounds: WagerRoundCard[];
  locale: string;
  league: string;
}) {
  if (!rounds.length) return null;

  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <CoinsIcon className="size-4 text-flag" />
        Matchday Wagers
      </h3>
      <div className="space-y-1.5">
        {rounds.map((r) => (
          <Link
            key={r.roundId}
            href={`/${locale}/${league}/groups/${r.groupId}/rounds/${r.roundId}`}
            className="block"
          >
            <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-medium truncate">{r.label}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ClockIcon className="size-3" />
                      {new Date(r.closesAt).toLocaleDateString(locale, {
                        dateStyle: "short",
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <UsersIcon className="size-3" />
                      {r.participantCount}
                    </span>
                    <span>
                      {r.potDisplay} {r.tokenSymbol}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.hasUserEntry && (
                    <Badge variant="outline" className="text-[10px] bg-pitch/10 text-pitch">
                      Entered
                    </Badge>
                  )}
                  <StatusBadge status={r.status} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: WagerRoundCard["status"] }) {
  const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    initialized: { label: "Open", variant: "default" },
    locked: { label: "Locked", variant: "secondary" },
    settled: { label: "Settled", variant: "outline" },
    cancelled: { label: "Cancelled", variant: "destructive" },
    closed: { label: "Closed", variant: "outline" },
  };
  const v = variants[status] ?? { label: status, variant: "outline" as const };
  return (
    <Badge variant={v.variant} className="text-[10px]">
      {v.label}
    </Badge>
  );
}
