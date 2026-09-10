import { teamCrestPath } from "@/lib/team-crests";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: "size-6 p-0.5", px: 24 },
  md: { box: "size-8 p-1", px: 32 },
  lg: { box: "size-10 p-1 sm:size-14 sm:p-1.5", px: 56 },
} as const;

// One team's crest on a white disc, sized to sit inline with its name. The
// disc keeps dark crests visible on the stadium-night theme and gives every
// row the same left edge. A team with no crest (unknown side, or a knockout
// placeholder like "Winner Group A") gets a quiet empty disc so alignment
// holds. Decorative: the adjacent text names the team.
export function TeamCrest({
  team,
  size = "sm",
  className,
}: {
  team: string | null | undefined;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const src = teamCrestPath(team);
  const { box, px } = SIZES[size];
  return (
    <span
      aria-hidden
      className={cn(
        "ring-border/50 inline-flex shrink-0 items-center justify-center rounded-full ring-1",
        src ? "bg-white" : "bg-muted",
        box,
        className,
      )}
    >
      {src ? (
        // Plain <img>, not next/image: these are our own pre-rasterized 128px
        // PNGs drawn at 24-56px, so the optimizer has nothing to gain. Routing
        // them through /_next/image cost one server round-trip per crest —
        // ~80 on a fixture list — plus a srcset in the markup for every row.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={px}
          height={px}
          loading="lazy"
          decoding="async"
          className="size-full object-contain"
        />
      ) : null}
    </span>
  );
}
