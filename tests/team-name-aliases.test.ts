import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeTeamName, REMOTE_TO_LOCAL_TEAM } from "@/lib/team-name-aliases";

/** Team names as they actually appear in a seeded fixtures migration. */
function fixtureTeamsFrom(migration: string): Set<string> {
  const sql = readFileSync(`supabase/migrations/${migration}`, "utf8");
  const teams = new Set<string>();
  for (const m of sql.matchAll(/\('([^']+)',\s*'([^']+)',\s*'[^']+'::timestamptz/g)) {
    teams.add(m[1]);
    teams.add(m[2]);
  }
  return teams;
}

const ligaMxFixtureTeams = () => fixtureTeamsFrom("20260723010000_liga_mx_official_fixtures.sql");
const laLigaFixtureTeams = () => fixtureTeamsFrom("20260726010000_la_liga_2026_27.sql");

describe("normalizeTeamName", () => {
  it("maps every alias to its local name", () => {
    for (const [remote, local] of Object.entries(REMOTE_TO_LOCAL_TEAM)) {
      expect(normalizeTeamName(remote)).toBe(local);
    }
  });

  it("passes through names that aren't aliased", () => {
    expect(normalizeTeamName("Mexico")).toBe("Mexico");
    expect(normalizeTeamName("Argentina")).toBe("Argentina");
    expect(normalizeTeamName("England")).toBe("England");
  });

  it("trims whitespace", () => {
    expect(normalizeTeamName("  Brazil  ")).toBe("Brazil");
  });

  it("returns empty string for null/undefined/empty", () => {
    expect(normalizeTeamName(null)).toBe("");
    expect(normalizeTeamName(undefined)).toBe("");
    expect(normalizeTeamName("")).toBe("");
  });
});

// The test above only proves the map is applied — it says nothing about whether
// a target name exists locally. An alias pointing at a name no fixture uses is
// worse than a missing alias: result-sync normalizes the remote name, finds no
// local match, logs "unmatched remote", and silently never writes the score.
// That is how "Tigres UANL" → "UANL" and "FC Juárez" → "FC Juárez" went
// unnoticed while the fixtures carried "Tigres UANL" and "Juárez".
describe("Liga MX aliases resolve to real fixture names", () => {
  const fixtureTeams = ligaMxFixtureTeams();

  it("parsed the fixtures", () => {
    expect(fixtureTeams.size).toBe(18);
  });

  // Every alias whose target looks like a Liga MX club must name a real one.
  it("every Liga MX alias target is a seeded team", () => {
    const mexicanTargets = new Set(
      Object.values(REMOTE_TO_LOCAL_TEAM).filter((target) =>
        // Only assert on targets that belong to this competition; the map also
        // covers World Cup nations and La Liga clubs.
        [...fixtureTeams].some(
          (team) => team === target || team.includes(target) || target.includes(team),
        ),
      ),
    );

    const broken = [...mexicanTargets].filter((t) => !fixtureTeams.has(t)).sort();
    expect(broken, "aliases pointing at names no fixture uses").toEqual([]);
  });

  // The exact strings ESPN's mex.1 scoreboard returns, captured live.
  it("normalizes the names ESPN actually sends", () => {
    const espnNames = [
      "América",
      "Atlante",
      "Atlas",
      "Atlético de San Luis",
      "Cruz Azul",
      "FC Juarez",
      "Guadalajara",
      "León",
      "Monterrey",
      "Necaxa",
      "Pachuca",
      "Puebla",
      "Pumas UNAM",
      "Querétaro",
      "Santos",
      "Tigres UANL",
      "Tijuana",
      "Toluca",
    ];

    const unresolved = espnNames
      .map((name) => ({ name, local: normalizeTeamName(name) }))
      .filter(({ local }) => !fixtureTeams.has(local));

    expect(unresolved, "ESPN names that would be logged as unmatched").toEqual([]);
  });
});

// La Liga's fixtures were seeded straight from football-data, so unlike Liga MX
// both providers have to agree with the seed rather than the seed being the
// pre-existing truth. If either feed's spelling stops normalizing to a seeded
// name, results for that club silently stop landing.
describe("La Liga aliases resolve to real fixture names", () => {
  const fixtureTeams = laLigaFixtureTeams();

  it("parsed the fixtures", () => {
    expect(fixtureTeams.size).toBe(20);
  });

  it("normalizes the long forms football-data sends", () => {
    // Exactly what PD season=2026 returns, captured live.
    const footballDataNames = [
      "Athletic Club",
      "CA Osasuna",
      "Club Atlético de Madrid",
      "Deportivo Alavés",
      "Elche CF",
      "FC Barcelona",
      "Getafe CF",
      "Levante UD",
      "Málaga CF",
      "RC Celta de Vigo",
      "RC Deportivo La Coruña",
      "RCD Espanyol de Barcelona",
      "Rayo Vallecano de Madrid",
      "Real Betis Balompié",
      "Real Madrid CF",
      "Real Racing Club de Santander",
      "Real Sociedad de Fútbol",
      "Sevilla FC",
      "Valencia CF",
      "Villarreal CF",
    ];

    expect(footballDataNames).toHaveLength(20);
    const unresolved = footballDataNames
      .map((name) => ({ name, local: normalizeTeamName(name) }))
      .filter(({ local }) => !fixtureTeams.has(local));
    expect(unresolved, "football-data names that would be unmatched").toEqual([]);

    // All 20 clubs must be reachable, not just 20 names collapsing onto fewer.
    expect(new Set(footballDataNames.map(normalizeTeamName)).size).toBe(20);
  });

  it("normalizes the short forms ESPN sends", () => {
    // A sample of esp.1 display names, captured live — the ones that differ from
    // football-data's spelling.
    const espnNames = [
      "Alavés",
      "Celta Vigo",
      "Deportivo La Coruña",
      "Elche",
      "Espanyol",
      "Getafe",
      "Levante",
      "Osasuna",
      "Racing Santander",
      "Rayo Vallecano",
      "Sevilla",
      "Villarreal",
    ];

    const unresolved = espnNames
      .map((name) => ({ name, local: normalizeTeamName(name) }))
      .filter(({ local }) => !fixtureTeams.has(local));
    expect(unresolved, "ESPN names that would be unmatched").toEqual([]);
  });
});
