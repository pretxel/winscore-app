import { cn } from "@/lib/utils";

// The matchday-board signature: a vertical league nameplate rail. The league's
// identity hue fills the rail; the name reads bottom-to-top in the expanded
// display face. Decorative — the lane it borders carries the real heading, so
// this is aria-hidden.
export function LeagueRail({
  label,
  hue,
  className,
}: {
  label: string;
  // CSS color for the league's identity (from its crest). Falls back to the
  // floodlight-gold accent when a league has no hue.
  hue?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex w-10 shrink-0 items-center justify-center border-r border-border py-4 sm:w-12",
        className,
      )}
      style={{ backgroundColor: hue ?? "var(--flag)" }}
    >
      <span
        className="font-heading text-[0.7rem] font-extrabold uppercase leading-none tracking-[0.22em] text-white"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {label}
      </span>
    </div>
  );
}
