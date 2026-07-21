import "server-only";
import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CompetitionRow } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import {
  getStageLabel,
  parseFormatConfig,
  providersSchema,
  brandingSchema,
  type CompetitionBranding,
  type CompetitionFormat,
  type CompetitionProviders,
} from "@/lib/competition-schema";

// A competition row with its JSONB columns parsed into typed objects.
export type ResolvedCompetition = CompetitionRow & {
  format: CompetitionFormat;
  providersConfig: CompetitionProviders;
  brandingConfig: CompetitionBranding;
};

export function resolveCompetition(row: CompetitionRow): ResolvedCompetition {
  return {
    ...row,
    format: parseFormatConfig(row.format_config),
    providersConfig: providersSchema.parse(row.providers ?? {}),
    brandingConfig: brandingSchema.parse(row.branding ?? {}),
  };
}

// The active (public) competition, resolved once per request. Returns null when
// no competition is active (helpers must treat that as "no competition
// selected" rather than throwing). Switching the active competition revalidates
// the affected paths/tags, so a fresh request picks up the change.
export const getActiveCompetition = cache(
  async (): Promise<ResolvedCompetition | null> => {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("competitions")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();
    return data ? resolveCompetition(data) : null;
  },
);

// Localized label for a stage in the active competition, falling back to the
// raw stage key when there is no active competition or the stage is unknown.
export async function getActiveStageLabel(
  stage: string,
  locale: Locale,
): Promise<string> {
  const comp = await getActiveCompetition();
  return comp ? getStageLabel(comp.format, stage, locale) : stage;
}

// Fixed product brand. Competition-independent: the same name carries every
// competition, so it never resolves from the active competition.
const PRODUCT_NAME = "Winscore";
// Competition fallbacks keep behavior identical when no competition is resolved
// (cold DB) or a branding field is unset. These describe the *edition*, not the
// product name.
const FALLBACK_SHORT_NAME = "World Cup 2026";
const FALLBACK_BRAND_CODE = "WC26";
// Email sender name stays competition-scoped (each competition sets its own in
// `branding.emailFromName`); this is only the cold-DB fallback.
const FALLBACK_EMAIL_FROM_NAME = "World Cup Pools";
const FALLBACK_NEWS_QUERY = '"World Cup 2026" OR "FIFA World Cup 2026"';

export type ResolvedBranding = {
  shortName: string;
  siteName: string;
  brandCode: string;
  ogAlt: string;
  emailFromName: string;
  newsQuery: string;
};

// Brand strings for a given league (short_name + branding JSONB), with World
// Cup defaults. The product name is fixed; the league surfaces only as the
// edition. Pass the league resolved from route/pool context, or null for the
// cold-DB fallback.
export function resolveBranding(
  comp: ResolvedCompetition | null,
): ResolvedBranding {
  const b = comp?.brandingConfig;
  const shortName = comp?.short_name ?? FALLBACK_SHORT_NAME;
  return {
    shortName,
    siteName: PRODUCT_NAME,
    brandCode: b?.brandCode ?? FALLBACK_BRAND_CODE,
    ogAlt: b?.ogAlt ?? `${shortName} · ${PRODUCT_NAME}`,
    emailFromName: b?.emailFromName ?? FALLBACK_EMAIL_FROM_NAME,
    newsQuery: b?.newsQuery ?? FALLBACK_NEWS_QUERY,
  };
}

// Branding for the active competition. Retained during the transition to
// concurrent leagues; callers with a league context should use
// `getBrandingForLeague(comp)` instead.
export async function getActiveBranding(): Promise<ResolvedBranding> {
  return resolveBranding(await getActiveCompetition());
}

// Branding for a league resolved from route/pool context.
export function getBrandingForLeague(
  comp: ResolvedCompetition | null,
): ResolvedBranding {
  return resolveBranding(comp);
}

// ---------------------------------------------------------------------------
// Concurrent-league resolution
//
// There is no single global "active competition" any more — a league is
// resolved from the request context: a `[league]` route slug or a pool's
// `competition_id`. These helpers are additive; the single-active
// `getActiveCompetition()` above stays until routes are migrated.
// ---------------------------------------------------------------------------

// Resolve a live league by slug. Returns null ("league unavailable") when the
// slug does not exist or the league is not live.
export const getLeagueBySlug = cache(
  async (slug: string): Promise<ResolvedCompetition | null> => {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("competitions")
      .select("*")
      .eq("slug", slug)
      .eq("is_live", true)
      .maybeSingle();
    return data ? resolveCompetition(data) : null;
  },
);

// Resolve the league a pool belongs to, from the pool's competition_id. The
// pool's league resolves even if it is no longer live (the pool still exists).
export const getLeagueForPool = cache(
  async (poolId: string): Promise<ResolvedCompetition | null> => {
    const supabase = await createServerSupabaseClient();
    const { data: pool } = await supabase
      .from("groups")
      .select("competition_id")
      .eq("id", poolId)
      .maybeSingle();
    if (!pool?.competition_id) return null;
    const { data } = await supabase
      .from("competitions")
      .select("*")
      .eq("id", pool.competition_id)
      .maybeSingle();
    return data ? resolveCompetition(data) : null;
  },
);

// Unified league resolver: from a route slug or a pool id. Returns null when the
// context resolves to no available league (unknown/non-live slug, or a pool
// whose league is missing) — callers route to the league catalog.
export async function getLeagueFromContext(ctx: {
  slug?: string;
  poolId?: string;
}): Promise<ResolvedCompetition | null> {
  if (ctx.poolId) return getLeagueForPool(ctx.poolId);
  if (ctx.slug) return getLeagueBySlug(ctx.slug);
  return null;
}

export type LeagueCatalogEntry = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  brandCode: string;
  joinCodePrefix: string;
};

// Catalog of every live league, for the "start a pool" picker. Ordered by name.
export const listLiveLeagues = cache(
  async (): Promise<LeagueCatalogEntry[]> => {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("competitions")
      .select("*")
      .eq("is_live", true)
      .order("name", { ascending: true });
    return (data ?? []).map((row) => {
      const comp = resolveCompetition(row);
      return {
        id: comp.id,
        slug: comp.slug,
        name: comp.name,
        shortName: comp.short_name,
        brandCode: comp.brandingConfig.brandCode ?? FALLBACK_BRAND_CODE,
        joinCodePrefix: comp.brandingConfig.joinCodePrefix ?? "WC",
      } satisfies LeagueCatalogEntry;
    });
  },
);
