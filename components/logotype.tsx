import { cn } from "@/lib/utils";

type Size = "xs" | "md" | "xl";

// Competition-neutral Winscore wordmark. The compact form drops the Pool suffix.

const FULL_VIEWBOX = "0 0 240 64";
const COMPACT_VIEWBOX = "0 0 160 64";

const PIXEL_HEIGHT: Record<Size, number> = {
  xs: 22,
  md: 44,
  xl: 96,
};

export function Logotype({
  size = "md",
  className,
  ariaLabel,
}: {
  size?: Size;
  className?: string;
  ariaLabel?: string;
}) {
  const compact = size === "xs";
  const viewBox = compact ? COMPACT_VIEWBOX : FULL_VIEWBOX;
  const heightPx = PIXEL_HEIGHT[size];
  const widthPx = compact ? heightPx * (160 / 64) : heightPx * (240 / 64);

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
      <text
        x="4"
        y="43"
        fontFamily="'Archivo Black', Arial Black, ui-sans-serif, sans-serif"
        fontWeight="900"
        fontSize="34"
        letterSpacing="-1.5"
        fill="currentColor"
      >
        WIN
      </text>

      <g>
        <rect
          x="76"
          y="8"
          width="80"
          height="48"
          rx="10"
          style={{ fill: "var(--pitch)" }}
        />
        <rect
          x="76"
          y="8"
          width="80"
          height="16"
          rx="10"
          fill="white"
          fillOpacity="0.08"
        />
        <text
          x="116"
          y="39"
          textAnchor="middle"
          fontFamily="'JetBrains Mono', ui-monospace, SFMono-Regular, monospace"
          fontWeight="800"
          fontSize="14"
          letterSpacing="0"
          style={{ fill: "var(--pitch-foreground)" }}
        >
          SCORE
        </text>
      </g>

      {compact ? null : (
        <g>
          {/* divider dot */}
          <circle cx="170" cy="32" r="2" fill="currentColor" opacity="0.5" />
          {/* Pool suffix in mono */}
          <text
            x="180"
            y="40"
            fontFamily="'JetBrains Mono', ui-monospace, SFMono-Regular, monospace"
            fontWeight="600"
            fontSize="18"
            letterSpacing="3"
            fill="currentColor"
          >
            POOL
          </text>
        </g>
      )}
    </svg>
  );
}
