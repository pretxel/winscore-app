#!/usr/bin/env node
// Team crest + league emblem fetcher. Pulls every club/national team of the
// seeded competitions from the result-sync providers, normalizes each provider
// name through lib/team-name-aliases.ts so files are keyed by the canonical
// name the fixtures carry, rasterizes each crest to a uniform transparent PNG
// under public/crests/, and emits lib/team-crests.generated.ts — the map the
// app reads at render time. The generated file and the images are committed,
// so the build never touches a provider.
//
// Rerun whenever a competition is added or its teams change:
//   node scripts/fetch-team-crests.mjs
//
// Needs FOOTBALL_DATA_TOKEN (read from .env.local when not already set). ESPN
// is keyless. A competition whose source fails is skipped with a warning; the
// generated file is only rewritten when at least one source succeeded.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { normalizeTeamName } from "../lib/team-name-aliases.ts";

const ROOT = path.resolve(
  import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname),
  "..",
);
const TEAMS_DIR = path.join(ROOT, "public", "crests", "teams");
const LEAGUES_DIR = path.join(ROOT, "public", "crests", "leagues");
const OUT_TS = path.join(ROOT, "lib", "team-crests.generated.ts");

const TEAM_PX = 128;
const LEAGUE_PX = 256;

// Where each seeded competition's crests come from. football-data covers the
// three competitions in its free tier; Liga MX is ESPN-only (same split as
// result sync). `slug` is the competitions.slug the league emblem is keyed by.
const SOURCES = [
  { slug: "champions-league-2026-2027", provider: "football-data", code: "CL", season: "2026" },
  { slug: "la-liga-2026-2027", provider: "football-data", code: "PD", season: "2026" },
  { slug: "world-cup-2026", provider: "football-data", code: "WC", season: "2026" },
  { slug: "liga-mx-apertura-2026", provider: "espn", leaguePath: "mex.1" },
];

function loadEnvToken() {
  if (process.env.FOOTBALL_DATA_TOKEN) return process.env.FOOTBALL_DATA_TOKEN;
  try {
    const env = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
    const line = env.split("\n").find((l) => l.startsWith("FOOTBALL_DATA_TOKEN="));
    return line?.slice("FOOTBALL_DATA_TOKEN=".length).trim().replace(/^"|"$/g, "") ?? null;
  } catch {
    return null;
  }
}

// File-safe key for a canonical team name: "Bodø/Glimt" → "bodo-glimt",
// "Atlético San Luis" → "atletico-san-luis". Mirrors teamCrestSlug in
// lib/team-crests.ts; keep the two in sync.
export function crestSlug(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ø/gi, "o")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function fetchJson(url, headers = {}) {
  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText} for ${url}`);
  return resp.json();
}

async function fetchBytes(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText} for ${url}`);
  return Buffer.from(await resp.arrayBuffer());
}

// One provider's team list, already normalized: [{ name, crestUrl }] plus the
// competition emblem URL.
async function loadFootballData(source, token) {
  const url = `https://api.football-data.org/v4/competitions/${source.code}/teams?season=${source.season}`;
  const body = await fetchJson(url, { "X-Auth-Token": token });
  return {
    emblemUrl: body.competition?.emblem ?? null,
    teams: (body.teams ?? []).map((t) => ({ name: normalizeTeamName(t.name), crestUrl: t.crest })),
  };
}

async function loadEspn(source) {
  const teamsBody = await fetchJson(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${source.leaguePath}/teams`,
  );
  const scoreboard = await fetchJson(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${source.leaguePath}/scoreboard`,
  );
  const logos = scoreboard.leagues?.[0]?.logos ?? [];
  const emblem = logos.find((l) => l.rel?.includes("default")) ?? logos[0];
  return {
    emblemUrl: emblem?.href ?? null,
    teams: (teamsBody.sports?.[0]?.leagues?.[0]?.teams ?? []).map((t) => ({
      name: normalizeTeamName(t.team.displayName),
      crestUrl: t.team.logos?.[0]?.href ?? null,
    })),
  };
}

// Uniform square PNG on a transparent background so crests of any aspect ratio
// sit on the same baseline in a row of fixtures.
async function rasterize(bytes, px) {
  return sharp(bytes, { density: 300 })
    .resize(px, px, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}

// The league's identity hue for the nameplate rail: the dominant opaque color
// of its emblem, as a CSS hex. Emblems with a near-white/black dominant tone
// are handled by hand in lib/league-marks.ts, so this is only a starting value.
async function dominantHex(png) {
  const { dominant } = await sharp(png).stats();
  const hex = (n) => n.toString(16).padStart(2, "0");
  return `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`;
}

async function main() {
  const token = loadEnvToken();
  fs.mkdirSync(TEAMS_DIR, { recursive: true });
  fs.mkdirSync(LEAGUES_DIR, { recursive: true });

  // canonical name → public path. Teams shared across competitions (e.g. Real
  // Madrid in La Liga and the Champions League) are written once; the first
  // source wins, which keeps the crest stable across reruns.
  const teamFiles = new Map();
  const leagueMarks = new Map();
  let succeeded = 0;

  for (const source of SOURCES) {
    let loaded;
    try {
      if (source.provider === "football-data") {
        if (!token) throw new Error("FOOTBALL_DATA_TOKEN is not set");
        loaded = await loadFootballData(source, token);
      } else {
        loaded = await loadEspn(source);
      }
    } catch (err) {
      console.warn(`skip ${source.slug}: ${err instanceof Error ? err.message : err}`);
      continue;
    }
    succeeded += 1;

    for (const team of loaded.teams) {
      if (!team.crestUrl || teamFiles.has(team.name)) continue;
      const file = `${crestSlug(team.name)}.png`;
      try {
        const png = await rasterize(await fetchBytes(team.crestUrl), TEAM_PX);
        fs.writeFileSync(path.join(TEAMS_DIR, file), png);
        teamFiles.set(team.name, `/crests/teams/${file}`);
      } catch (err) {
        console.warn(`  no crest for ${team.name}: ${err instanceof Error ? err.message : err}`);
      }
    }

    if (loaded.emblemUrl) {
      const file = `${source.slug}.png`;
      try {
        const png = await rasterize(await fetchBytes(loaded.emblemUrl), LEAGUE_PX);
        fs.writeFileSync(path.join(LEAGUES_DIR, file), png);
        leagueMarks.set(source.slug, {
          emblem: `/crests/leagues/${file}`,
          hue: await dominantHex(png),
        });
      } catch (err) {
        console.warn(`  no emblem for ${source.slug}: ${err instanceof Error ? err.message : err}`);
      }
    }
    console.log(`${source.slug}: ${loaded.teams.length} teams`);
  }

  if (succeeded === 0) {
    console.error("every source failed; leaving the generated file untouched");
    process.exit(1);
  }

  const sortedTeams = [...teamFiles.entries()].sort(([a], [b]) => a.localeCompare(b));
  const sortedLeagues = [...leagueMarks.entries()].sort(([a], [b]) => a.localeCompare(b));
  const lines = [
    "// GENERATED by scripts/fetch-team-crests.mjs — do not edit by hand.",
    "// Rerun the script to refresh crests after adding a competition or team.",
    "",
    "// Canonical team name (as the fixtures carry it) → public crest path.",
    "export const TEAM_CREST_FILES: Record<string, string> = {",
    ...sortedTeams.map(([name, file]) => `  ${JSON.stringify(name)}: ${JSON.stringify(file)},`),
    "};",
    "",
    "// competitions.slug → league emblem path and the emblem's dominant hue.",
    "export const LEAGUE_EMBLEMS: Record<string, { emblem: string; hue: string }> = {",
    ...sortedLeagues.map(
      ([slug, mark]) =>
        `  ${JSON.stringify(slug)}: { emblem: ${JSON.stringify(mark.emblem)}, hue: ${JSON.stringify(mark.hue)} },`,
    ),
    "};",
    "",
  ];
  fs.writeFileSync(OUT_TS, lines.join("\n"));
  console.log(`wrote ${OUT_TS}: ${sortedTeams.length} teams, ${sortedLeagues.length} leagues`);
}

await main();
