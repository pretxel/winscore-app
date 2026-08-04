"use client";

import { CheckCircle2Icon, ChevronDownIcon, CoinsIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LocalTime } from "@/components/local-time";
import { Badge } from "@/components/ui/badge";
// This Button has no `asChild`; a link styled as a button uses buttonVariants,
// which is the pattern the rest of the app follows.
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RoundProgress } from "@/lib/groups/round-progress";

function RoundRow({
  round,
  groupId,
  league,
  locale,
}: {
  round: RoundProgress;
  groupId: string;
  league: string;
  locale: string;
}) {
  const t = useTranslations("roundList");
  const [expanded, setExpanded] = useState(false);
  const isComplete = round.predicted === round.total;

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={expanded}
        >
          <ChevronDownIcon
            className={`size-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{round.label}</span>
            <span className="block text-xs text-muted-foreground">
              <LocalTime iso={round.startsAt} format="date" />
              {" · "}
              {isComplete ? (
                <span className="inline-flex items-center gap-1 text-pitch">
                  <CheckCircle2Icon className="size-3" />
                  {t("complete")}
                </span>
              ) : (
                t("progress", { predicted: round.predicted, total: round.total })
              )}
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {round.wagerAvailable && (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <CoinsIcon className="size-3" />
              {t("wagerBadge")}
            </Badge>
          )}
          <Link
            href={`/${locale}/${league}/groups/${groupId}/rounds/${round.roundId}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t("openRound")}
          </Link>
        </div>
      </div>

      {expanded && (
        <div className="space-y-2 border-t px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {t("pendingHeading")}
          </p>
          {round.openMatches.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("noPending")}</p>
          ) : (
            <ul className="space-y-1">
              {round.openMatches.map((m) => (
                <li key={m.id} className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate">
                    {m.homeTeam} — {m.awayTeam}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    <LocalTime iso={m.kickoffAt} format="datetime" />
                  </span>
                </li>
              ))}
            </ul>
          )}
          {round.lockedUnpredicted > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("lockedNote", { count: round.lockedUnpredicted })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The member's rounds: what they still owe predictions for, and which fixtures
 * are still open. Past rounds sit behind a disclosure so the actionable ones
 * stay at the top.
 */
export function RoundList({
  actionable,
  past,
  groupId,
  league,
  locale,
}: {
  actionable: RoundProgress[];
  past: RoundProgress[];
  groupId: string;
  league: string;
  locale: string;
}) {
  const t = useTranslations("roundList");
  const [showPast, setShowPast] = useState(false);

  if (actionable.length === 0 && past.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actionable.map((round) => (
          <RoundRow
            key={round.roundId}
            round={round}
            groupId={groupId}
            league={league}
            locale={locale}
          />
        ))}

        {past.length > 0 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setShowPast((v) => !v)}
              aria-expanded={showPast}
            >
              {showPast ? t("hidePast") : t("showPast")}
            </Button>
            {showPast &&
              past.map((round) => (
                <RoundRow
                  key={round.roundId}
                  round={round}
                  groupId={groupId}
                  league={league}
                  locale={locale}
                />
              ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
