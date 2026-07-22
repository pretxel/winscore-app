import { cn } from "@/lib/utils";

type Size = "xs" | "md" | "xl";

// Geometry constants tuned for the viewBox 0 0 240 64.
// Full form: (blue W tile) | INSCORE | · {edition?}
// Compact form (xs): the W tile alone, viewBox tightened to 0 0 64 64.

const FULL_VIEWBOX = "0 0 240 64";
const COMPACT_VIEWBOX = "0 0 64 64";

const PIXEL_HEIGHT: Record<Size, number> = {
  xs: 22,
  md: 44,
  xl: 96,
};

const DISPLAY_FONT = "var(--font-archivo), 'Archivo Black', sans-serif";

export function Logotype({
  size = "md",
  className,
  ariaLabel,
  edition,
}: {
  size?: Size;
  className?: string;
  ariaLabel?: string;
  // Optional competition edition rendered as a small subtitle suffix after
  // the wordmark. Omitted when unset.
  edition?: string;
}) {
  const compact = size === "xs";
  const viewBox = compact ? COMPACT_VIEWBOX : FULL_VIEWBOX;
  const heightPx = PIXEL_HEIGHT[size];
  const widthPx = compact ? heightPx : heightPx * (240 / 64);

  return (
    <svg
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      viewBox={viewBox}
      width={widthPx}
      height={heightPx}
      preserveAspectRatio="xMidYMid meet"
      className={cn("shrink-0 align-middle text-foreground", className)}
    >
      {/* W tile: blue rounded square with the brand initial */}
      <g>
        <rect
          x={compact ? 8 : 4}
          y="8"
          width="48"
          height="48"
          rx="10"
          style={{ fill: "var(--pitch)" }}
        />
        {/* Subtle inner highlight (pitch-stripe motif) */}
        <rect
          x={compact ? 8 : 4}
          y="8"
          width="48"
          height="16"
          rx="10"
          fill="white"
          fillOpacity="0.08"
        />
        <text
          x={compact ? 32 : 28}
          y="43"
          textAnchor="middle"
          style={{
            fontFamily: DISPLAY_FONT,
            fill: "var(--pitch-foreground)",
          }}
          fontSize="30"
          letterSpacing="-1"
        >
          W
        </text>
      </g>

      {compact ? null : (
        <g fill="currentColor">
          {/* INSCORE — completes the WINSCORE wordmark after the W tile */}
          <text
            x="64"
            y="43"
            style={{ fontFamily: DISPLAY_FONT }}
            fontSize="26"
            letterSpacing="1"
          >
            INSCORE
          </text>
          {edition ? (
            <text
              x="200"
              y="43"
              style={{ fontFamily: DISPLAY_FONT }}
              fontSize="16"
              letterSpacing="1"
              opacity="0.55"
            >
              {`· ${edition}`}
            </text>
          ) : null}
        </g>
      )}
    </svg>
  );
}
