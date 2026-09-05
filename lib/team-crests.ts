import { TEAM_CREST_FILES } from "@/lib/team-crests.generated";
import { normalizeTeamName } from "@/lib/team-name-aliases";

// File-safe key for a canonical team name. Mirrors crestSlug in
// scripts/fetch-team-crests.mjs; keep the two in sync.
export function teamCrestSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ø/gi, "o")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Public crest path for a team as the fixtures name it, or null when no crest
// was fetched for it (unknown club, placeholder like "Winner Group A").
export function teamCrestPath(name: string | null | undefined): string | null {
  if (!name) return null;
  return TEAM_CREST_FILES[name] ?? TEAM_CREST_FILES[normalizeTeamName(name)] ?? null;
}
