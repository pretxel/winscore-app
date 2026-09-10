import type { MatchPick } from "@/lib/match-picks";
import { cn } from "@/lib/utils";

export type MatchPicksLabels = {
  you: string;
  noName: string;
  points: (points: number) => string;
  hit: Record<"exact" | "winner_gd" | "winner" | "miss", string>;
};

const HIT_TONE: Record<NonNullable<MatchPick["hitType"]>, string> = {
  exact: "bg-pitch/15 text-pitch ring-pitch/40",
  winner_gd: "bg-flag/15 text-flag ring-flag/50",
  winner: "bg-secondary text-secondary-foreground ring-border",
  miss: "bg-muted text-muted-foreground ring-border",
};

// Everyone's picks for one match, read once the match has locked. One row per
// submitted pick: name, scoreline, and, once the match is final, the points it
// earned with the hit tier as the tooltip. The viewer's own row is marked.
export function MatchPicks({
  picks,
  currentUserId,
  homeTeam,
  awayTeam,
  labels,
}: {
  picks: MatchPick[];
  currentUserId: string;
  homeTeam: string;
  awayTeam: string;
  labels: MatchPicksLabels;
}) {
  return (
    <ul className="divide-border overflow-hidden rounded-xl border border-border bg-card divide-y">
      {picks.map((p) => {
        const isYou = p.userId === currentUserId;
        return (
          <li
            key={p.userId}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 text-sm",
              isYou && "bg-pitch/[0.06]",
            )}
          >
            <span className="min-w-0 flex-1 truncate font-medium">
              {p.displayName ?? labels.noName}
              {isYou ? (
                <span className="ml-2 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                  {labels.you}
                </span>
              ) : null}
            </span>
            <span
              className="font-mono text-base font-semibold tabular-nums"
              aria-label={`${homeTeam} ${p.homeGoals} ${awayTeam} ${p.awayGoals}`}
            >
              {p.homeGoals}–{p.awayGoals}
            </span>
            {p.hitType && p.points != null ? (
              <span
                className={cn(
                  "inline-flex min-w-16 shrink-0 items-center justify-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] uppercase ring-1 ring-inset",
                  HIT_TONE[p.hitType],
                )}
                title={labels.hit[p.hitType]}
              >
                {labels.points(p.points)}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
