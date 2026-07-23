import { env } from "@/lib/env";
import type { ProviderConfig, RemoteMatch, ResultProvider } from "@/lib/result-sync/types";

// World Cup 2026 defaults; overridden per competition via ProviderConfig.
const DEFAULT_CODE = "WC";
const DEFAULT_SEASON = "2026";

function footballDataUrl(config?: ProviderConfig): string {
  const code = config?.footballData?.code ?? DEFAULT_CODE;
  const season = config?.footballData?.season ?? DEFAULT_SEASON;
  return `https://api.football-data.org/v4/competitions/${code}/matches?season=${season}`;
}

// Primary source. One request returns the whole competition, so the `dates`
// hint is ignored — scoping happens in the matching pipeline.
export const footballDataProvider: ResultProvider = {
  name: "football-data",

  available() {
    return env.footballDataToken != null;
  },

  async fetchMatches(_dates?: string[], config?: ProviderConfig): Promise<RemoteMatch[]> {
    if (!env.footballDataToken) return [];
    const resp = await fetch(footballDataUrl(config), {
      headers: { "X-Auth-Token": env.footballDataToken },
      // No Next caching for sync sources.
      cache: "no-store",
    });
    if (!resp.ok) {
      throw new Error(`Football-Data fetch failed: ${resp.status} ${resp.statusText}`);
    }
    const body = (await resp.json()) as {
      matches?: (RemoteMatch & { matchday?: number; stage?: string })[];
    };
    return (body.matches ?? []).map((m) => ({
      ...m,
      // Preserve reliable provider round key: combine stage + matchday when available.
      // Example: "REGULAR_SEASON:3" or "GROUP_STAGE:1"
      // Falls back to the API's stage field alone.
      stage: m.stage && m.matchday != null ? `${m.stage}:${m.matchday}` : (m.stage ?? null),
    }));
  },
};
