"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangleIcon, CheckCircle2Icon, ClockIcon, RefreshCwIcon } from "lucide-react";

interface ReconciliationStatus {
  roundId: string;
  roundLabel: string;
  poolName: string;
  onChainTotal: number;
  dbTotal: number;
  mismatch: number;
  participantDelta: number;
  staleIntents: number;
  orphanedEntries: number;
  lastReconciledAt: string | null;
}

interface Props {
  items: ReconciliationStatus[];
  locale: string;
}

export function ReconciliationDashboard({ items, locale }: Props) {
  const totalMismatch = items.reduce((s, i) => s + Math.abs(i.mismatch), 0);
  const totalStale = items.reduce((s, i) => s + i.staleIntents, 0);
  const totalOrphaned = items.reduce((s, i) => s + i.orphanedEntries, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-xs text-muted-foreground">Balance Mismatch</p>
              <p className="text-2xl font-mono font-bold">
                {totalMismatch}
              </p>
            </div>
            {totalMismatch === 0 ? (
              <CheckCircle2Icon className="size-8 text-pitch" />
            ) : (
              <AlertTriangleIcon className="size-8 text-destructive" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-xs text-muted-foreground">Stale Intents</p>
              <p className="text-2xl font-mono font-bold">{totalStale}</p>
            </div>
            <ClockIcon className="size-8 text-amber-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-xs text-muted-foreground">Orphaned</p>
              <p className="text-2xl font-mono font-bold">{totalOrphaned}</p>
            </div>
            <RefreshCwIcon className="size-8 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Round Reconciliation</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              All rounds are reconciled.
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.roundId}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-medium truncate">{item.roundLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.poolName}
                      {item.lastReconciledAt
                        ? ` · Last: ${new Date(item.lastReconciledAt).toLocaleDateString(locale)}`
                        : " · Never reconciled"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.mismatch !== 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        Δ {item.mismatch}
                      </Badge>
                    )}
                    {item.staleIntents > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {item.staleIntents} stale
                      </Badge>
                    )}
                    {item.orphanedEntries > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        {item.orphanedEntries} orphaned
                      </Badge>
                    )}
                    {item.mismatch === 0 &&
                      item.staleIntents === 0 &&
                      item.orphanedEntries === 0 && (
                        <CheckCircle2Icon className="size-4 text-pitch" />
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
