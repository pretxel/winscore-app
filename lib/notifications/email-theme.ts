// Shared brand palette for transactional emails — the single source of truth
// for email brand colors. Values are fixed hex equivalents of the app's
// light-theme oklch tokens (blue brand anchored on #135FD1); mail clients can't
// resolve var()/oklch, so every template inlines these literals into `style`
// attributes rather than defining its own palette.
export const C = {
  background: "#FAF9F4",
  card: "#FFFFFF",
  ink: "#1B2330",
  muted: "#6B7280",
  border: "#E5E2D7",
  pitch: "#135FD1",
  pitchFg: "#FAF9F4",
  pitchTint: "#E7EFFC",
  flag: "#E7B53C",
  flagFg: "#3A2E14",
  mutedTint: "#F0EEE6",
  live: "#D6402F",
} as const;
