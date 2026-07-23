"use client";

import { CheckIcon, Loader2Icon, LockIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BulkPredictionResult } from "./actions";
import { submitBulkPredictions } from "./actions";

interface Fixture {
  id: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  status: string;
  stage: string;
  group_code: string | null;
  venue: string | null;
}

interface Props {
  fixtures: Fixture[];
  initialPredictions: Map<string, { home: number; away: number }>;
  poolId: string;
  roundId: string;
  league: string;
  locale: string;
}

export function MatchdayPredictionBoard({
  fixtures,
  initialPredictions,
  poolId,
  roundId,
  league,
  locale,
}: Props) {
  const t = useTranslations("matchdaySheet");
  const _common = useTranslations("matchStatus");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<BulkPredictionResult | null>(null);
  const [picks, setPicks] = useState<Map<string, { home: number; away: number }>>(() => {
    const map = new Map(initialPredictions);
    for (const f of fixtures) {
      if (!map.has(f.id)) {
        map.set(f.id, { home: 0, away: 0 });
      }
    }
    return map;
  });

  const [lockedIds, _setLockedIds] = useState<Set<string>>(() => {
    const now = Date.now();
    return new Set(
      fixtures
        .filter((f) => f.status !== "scheduled" || new Date(f.kickoff_at).getTime() <= now)
        .map((f) => f.id),
    );
  });

  const handleSave = () => {
    const predictions = fixtures
      .filter((f) => !lockedIds.has(f.id))
      .map((f) => {
        const pick = picks.get(f.id) ?? { home: 0, away: 0 };
        return {
          matchId: f.id,
          homeGoals: pick.home,
          awayGoals: pick.away,
        };
      });

    if (predictions.length === 0) return;

    startTransition(() => {
      setResult(null);
      submitBulkPredictions({
        poolId,
        roundId,
        league,
        predictions,
      }).then(setResult);
    });
  };

  return (
    <div className="space-y-3">
      {fixtures.map((fixture) => {
        const pick = picks.get(fixture.id) ?? { home: 0, away: 0 };
        const locked = lockedIds.has(fixture.id);
        const hasPick = initialPredictions.has(fixture.id) && !locked;

        return (
          <Card
            key={fixture.id}
            className={cn("bg-scoreboard/80 border-border/50", locked && "opacity-50")}
          >
            <CardContent className="flex items-center gap-3 py-3">
              {/* Team info */}
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {fixture.stage && (
                    <Badge variant="outline" className="text-[10px] px-1">
                      {fixture.group_code
                        ? `${fixture.stage} · ${fixture.group_code}`
                        : fixture.stage}
                    </Badge>
                  )}
                  {locked && <LockIcon className="size-3" aria-label={t("locked")} />}
                  {hasPick && !locked && (
                    <CheckIcon className="size-3 text-pitch" aria-label={t("picked")} />
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-heading text-base font-semibold leading-tight truncate">
                    {fixture.home_team}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">vs</span>
                  <span className="font-heading text-base font-semibold leading-tight truncate">
                    {fixture.away_team}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(fixture.kickoff_at).toLocaleString(locale, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                  {fixture.venue ? ` · ${fixture.venue}` : ""}
                </p>
              </div>

              {/* Score steppers */}
              <div className="flex shrink-0 items-center gap-1">
                {/* Home goals */}
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    disabled={locked || isPending}
                    onClick={() => {
                      const current = picks.get(fixture.id) ?? {
                        home: 0,
                        away: 0,
                      };
                      if (current.home > 0) {
                        setPicks(
                          new Map(picks).set(fixture.id, {
                            ...current,
                            home: current.home - 1,
                          }),
                        );
                      }
                    }}
                  >
                    <MinusIcon className="size-3" />
                  </Button>
                  <span className="w-7 text-center font-mono text-base tabular-nums font-semibold">
                    {pick.home}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    disabled={locked || isPending || pick.home >= 20}
                    onClick={() => {
                      const current = picks.get(fixture.id) ?? {
                        home: 0,
                        away: 0,
                      };
                      if (current.home < 20) {
                        setPicks(
                          new Map(picks).set(fixture.id, {
                            ...current,
                            home: current.home + 1,
                          }),
                        );
                      }
                    }}
                  >
                    <PlusIcon className="size-3" />
                  </Button>
                </div>

                <span className="w-4 text-center text-xs text-muted-foreground font-mono">–</span>

                {/* Away goals */}
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    disabled={locked || isPending || pick.away <= 0}
                    onClick={() => {
                      const current = picks.get(fixture.id) ?? {
                        home: 0,
                        away: 0,
                      };
                      if (current.away > 0) {
                        setPicks(
                          new Map(picks).set(fixture.id, {
                            ...current,
                            away: current.away - 1,
                          }),
                        );
                      }
                    }}
                  >
                    <MinusIcon className="size-3" />
                  </Button>
                  <span className="w-7 text-center font-mono text-base tabular-nums font-semibold">
                    {pick.away}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    disabled={locked || isPending || pick.away >= 20}
                    onClick={() => {
                      const current = picks.get(fixture.id) ?? {
                        home: 0,
                        away: 0,
                      };
                      if (current.away < 20) {
                        setPicks(
                          new Map(picks).set(fixture.id, {
                            ...current,
                            away: current.away + 1,
                          }),
                        );
                      }
                    }}
                  >
                    <PlusIcon className="size-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Save button */}
      {fixtures.some((f) => !lockedIds.has(f.id)) && (
        <div className="space-y-2">
          <Button onClick={handleSave} disabled={isPending} className="w-full" size="lg">
            {isPending ? (
              <>
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                {t("saving")}
              </>
            ) : (
              t("saveAllPicks")
            )}
          </Button>

          {result && result.ok === false && (
            <p className="text-center text-sm text-destructive">{result.error}</p>
          )}
          {result && result.ok === true && (
            <p className="text-center text-sm text-pitch">
              {t("saved", { count: result.saved })}
              {result.locked.length > 0 &&
                ` · ${t("lockedCount", { count: result.locked.length })}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
