import { cn } from "@/lib/utils";

// A split-flap scoreline: each side reads as a tabular monospace cell. When a
// value changes, its cell is remounted (via a changed key) so the `.flap-animate`
// keyframe replays — the flap-board flip. `prefers-reduced-motion` renders it
// static. Null values show an en dash (not yet played).
export function Scoreline({
  home,
  away,
  className,
}: {
  home: number | null;
  away: number | null;
  className?: string;
}) {
  const h = home == null ? "–" : String(home);
  const a = away == null ? "–" : String(away);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-sm font-semibold tabular-nums text-foreground",
        className,
      )}
      aria-label={`${h} to ${a}`}
    >
      <span key={`h-${h}`} className="flap-animate inline-block">
        {h}
      </span>
      <span className="text-muted-foreground" aria-hidden>
        –
      </span>
      <span key={`a-${a}`} className="flap-animate inline-block">
        {a}
      </span>
    </span>
  );
}
