import { teamCrestPath } from "@/lib/team-crests";
import { cn } from "@/lib/utils";

// A tight row of overlapping team crests — the "who's in it" glance for a
// league. Crests sit on white discs because most are drawn for a light ground
// and vanish on the stadium-night theme. Teams without a crest are skipped;
// the overflow count covers everything not shown.
export function TeamCrestCluster({
  teams,
  max = 7,
  overflowLabel,
  className,
}: {
  teams: string[];
  max?: number;
  overflowLabel: (count: number) => string;
  className?: string;
}) {
  const withCrest = teams
    .map((name) => ({ name, src: teamCrestPath(name) }))
    .filter((t): t is { name: string; src: string } => t.src !== null);
  const shown = withCrest.slice(0, max);
  const overflow = teams.length - shown.length;
  if (shown.length === 0) return null;

  return (
    <ul className={cn("flex items-center", className)} aria-label={teams.join(", ")}>
      {shown.map((t, i) => (
        <li
          key={t.name}
          className={cn(
            "ring-card outline-border/40 relative size-8 shrink-0 rounded-full bg-white p-1 outline outline-1 ring-2 sm:size-9",
            i > 0 && "-ml-2",
          )}
          style={{ zIndex: shown.length - i }}
          title={t.name}
        >
          {/* Plain <img> for the same reason as TeamCrest: own static PNGs at a
              fixed small size, so the optimizer only adds round-trips. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={t.src}
            alt=""
            width={36}
            height={36}
            loading="lazy"
            decoding="async"
            className="size-full object-contain"
          />
        </li>
      ))}
      {overflow > 0 ? (
        <li className="text-muted-foreground ml-2 text-xs font-medium tabular-nums">
          {overflowLabel(overflow)}
        </li>
      ) : null}
    </ul>
  );
}
