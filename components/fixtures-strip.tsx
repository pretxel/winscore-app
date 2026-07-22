import { Scoreline } from "@/components/scoreline";
import { LocalTime } from "@/components/local-time";
import type { LaneFixture } from "@/lib/home";

// Compact horizontal strip of a league's live/next fixtures. Live matches show a
// split-flap Scoreline + a Live pip; upcoming ones show the kickoff time. Shared
// by the cross-league home lanes and the pool dashboard. Renders nothing when
// there are no fixtures.
export function FixturesStrip({ fixtures }: { fixtures: LaneFixture[] }) {
  if (fixtures.length === 0) return null;
  return (
    <ul className="flex gap-2 overflow-x-auto pb-1">
      {fixtures.map((f) => (
        <li
          key={f.id}
          className="border-border bg-background/50 flex shrink-0 flex-col gap-1.5 rounded-lg border px-3 py-2"
        >
          <div className="flex min-w-52 items-center justify-between gap-2">
            <span className="max-w-24 truncate text-xs font-medium" title={f.homeTeam}>
              {f.homeTeam}
            </span>
            {f.status === "live" ? (
              <Scoreline home={f.homeScore} away={f.awayScore} />
            ) : (
              <span className="text-muted-foreground font-mono text-xs">
                <LocalTime iso={f.kickoffAt} format="time" />
              </span>
            )}
            <span
              className="max-w-24 truncate text-right text-xs font-medium"
              title={f.awayTeam}
            >
              {f.awayTeam}
            </span>
          </div>
          {f.status === "live" ? (
            <span className="text-live inline-flex items-center gap-1 font-mono text-[10px] tracking-widest uppercase">
              <span
                aria-hidden
                className="bg-live size-1.5 animate-pulse rounded-full"
              />
              Live
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
