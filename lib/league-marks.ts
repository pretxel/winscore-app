import { LEAGUE_EMBLEMS } from "@/lib/team-crests.generated";

export type LeagueMark = {
  // Public path of the league's emblem PNG (transparent, square canvas).
  emblem: string;
  // The rail / identity color. Hand-picked per league: the generated dominant
  // hue is a poor identity when an emblem is mostly black or white text (UEFA,
  // FIFA), so this map wins over it. Undefined means "use the floodlight gold".
  hue?: string;
};

// Curated identity hues, keyed by competitions.slug. The nameplate rail sets
// white type on top, so every hue here is dark enough to carry it.
const CURATED_HUES: Record<string, string | undefined> = {
  "champions-league-2026-2027": "#0b1f5b",
  "la-liga-2026-2027": "#e63b2e",
  "liga-mx-apertura-2026": "#0a3d7a",
  // The World Cup keeps the corner-flag gold — the brand's own signature.
  "world-cup-2026": undefined,
};

export function leagueMark(slug: string): LeagueMark | null {
  const generated = LEAGUE_EMBLEMS[slug];
  if (!generated) return null;
  return {
    emblem: generated.emblem,
    hue: slug in CURATED_HUES ? CURATED_HUES[slug] : generated.hue,
  };
}
