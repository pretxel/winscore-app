import { beforeEach, describe, expect, it, vi } from "vitest";

// Unit tests for the AI match-summary generator: idempotency, status gating,
// key short-circuit, prompt shape, versioned persistence (auto = active, drafts
// inactive), and styled regeneration.

const envMock = vi.hoisted(
  () =>
    ({
      openrouterApiKey: "test-key",
      openrouterModel: "test/model",
      siteUrl: "http://localhost:3000",
    }) as {
      openrouterApiKey: string | null;
      openrouterModel: string;
      siteUrl: string;
    },
);

vi.mock("@/lib/env", () => ({ env: envMock }));
vi.mock("@/lib/ai/openrouter", () => ({ createChatCompletion: vi.fn() }));
vi.mock("@/lib/matches/match-image-prompt", () => ({
  generateMatchImagePrompt: vi.fn(),
}));
vi.mock("@/lib/matches/match-image-render", () => ({
  requestMatchImageRender: vi.fn(),
}));

import { createChatCompletion } from "@/lib/ai/openrouter";
import { generateMatchImagePrompt } from "@/lib/matches/match-image-prompt";
import { requestMatchImageRender } from "@/lib/matches/match-image-render";
import {
  buildSummaryPrompt,
  generateMatchSummary,
  generatePendingSummaries,
  STYLE_PRESETS,
  type SummaryEvent,
  type SummaryMatch,
} from "@/lib/matches/match-summary";

const chatMock = vi.mocked(createChatCompletion);
const imagePromptMock = vi.mocked(generateMatchImagePrompt);
const renderMock = vi.mocked(requestMatchImageRender);

const FINAL_MATCH: SummaryMatch & { status: string } = {
  home_team: "Mexico",
  away_team: "Canada",
  home_score: 2,
  away_score: 1,
  status: "final",
  stage: "group",
  group_code: "A",
};

type AdminOpts = {
  // Rows the existence check (auto mode) sees; an existing recap means "skip".
  existing?: { id: string } | { id: string }[] | null;
  match?: Record<string, unknown> | null;
  events?: unknown[];
  insertError?: { code?: string; message?: string } | null;
  insertedId?: string;
};

function makeAdmin(opts: AdminOpts) {
  const insertPayloads: Record<string, unknown>[] = [];
  const insert = vi.fn((payload: Record<string, unknown>) => {
    insertPayloads.push(payload);
    return {
      select: () => ({
        single: async () => ({
          data: opts.insertError ? null : { id: opts.insertedId ?? "s-new" },
          error: opts.insertError ?? null,
        }),
      }),
    };
  });
  const existenceRows = opts.existing
    ? Array.isArray(opts.existing)
      ? opts.existing
      : [opts.existing]
    : [];
  const from = vi.fn((table: string) => {
    if (table === "match_summaries") {
      return {
        // Auto-mode existence check: .select("id").eq("match_id", id).limit(1)
        select: () => ({
          eq: () => ({
            limit: async () => ({ data: existenceRows, error: null }),
          }),
        }),
        insert,
      };
    }
    if (table === "matches") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: opts.match ?? null, error: null }),
          }),
        }),
      };
    }
    if (table === "match_events") {
      return {
        select: () => ({
          eq: () => ({
            order: async () => ({ data: opts.events ?? [], error: null }),
          }),
        }),
      };
    }
    throw new Error(`unexpected from(${table})`);
  });
  return { from, insert, insertPayloads };
}

const GOAL: SummaryEvent = {
  type: "goal",
  team: "home",
  minute: 12,
  extra_minute: null,
  player: "Lozano",
  detail: null,
};

beforeEach(() => {
  envMock.openrouterApiKey = "test-key";
  chatMock.mockReset();
  imagePromptMock.mockReset();
  imagePromptMock.mockResolvedValue({ generated: true });
  renderMock.mockReset();
  renderMock.mockResolvedValue({ requested: true });
});

describe("generateMatchSummary (auto mode)", () => {
  it("short-circuits without DB or network when the key is unset", async () => {
    envMock.openrouterApiKey = null;
    const admin = makeAdmin({});
    const result = await generateMatchSummary(admin as never, "m1");
    expect(result).toEqual({ generated: false, reason: "no-key" });
    expect(admin.from).not.toHaveBeenCalled();
    expect(chatMock).not.toHaveBeenCalled();
  });

  it("skips when any version already exists", async () => {
    const admin = makeAdmin({ existing: { id: "s1" } });
    const result = await generateMatchSummary(admin as never, "m1");
    expect(result).toEqual({ generated: false, reason: "exists" });
    expect(chatMock).not.toHaveBeenCalled();
    expect(admin.insert).not.toHaveBeenCalled();
  });

  it("skips when multiple versions already exist (multi-row tolerant)", async () => {
    const admin = makeAdmin({ existing: [{ id: "s1" }, { id: "s2" }] });
    const result = await generateMatchSummary(admin as never, "m1");
    expect(result).toEqual({ generated: false, reason: "exists" });
    expect(admin.insert).not.toHaveBeenCalled();
  });

  it("skips a non-final match", async () => {
    const admin = makeAdmin({
      existing: null,
      match: { ...FINAL_MATCH, status: "live" },
    });
    const result = await generateMatchSummary(admin as never, "m1");
    expect(result).toEqual({ generated: false, reason: "not-final" });
    expect(chatMock).not.toHaveBeenCalled();
    expect(admin.insert).not.toHaveBeenCalled();
  });

  it("skips when the match is missing", async () => {
    const admin = makeAdmin({ existing: null, match: null });
    const result = await generateMatchSummary(admin as never, "m1");
    expect(result).toEqual({ generated: false, reason: "missing" });
    expect(chatMock).not.toHaveBeenCalled();
  });

  it("generates and persists an ACTIVE neutral version on success", async () => {
    chatMock.mockResolvedValue({
      content: "Mexico edged Canada 2-1.",
      model: "test/model",
      promptTokens: 11,
      completionTokens: 22,
    });
    const admin = makeAdmin({
      existing: null,
      match: FINAL_MATCH,
      events: [GOAL],
      insertedId: "s-auto",
    });
    const result = await generateMatchSummary(admin as never, "m1");
    expect(result).toEqual({ generated: true, summaryId: "s-auto" });
    expect(chatMock).toHaveBeenCalledTimes(1);
    expect(admin.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        match_id: "m1",
        content: "Mexico edged Canada 2-1.",
        provider: "openrouter",
        model: "test/model",
        prompt_tokens: 11,
        completion_tokens: 22,
        locale: "en",
        // Auto path now defaults to the dramatic style.
        style_key: "dramatic",
        style_instruction: STYLE_PRESETS.dramatic,
        is_active: true,
      }),
    );
    // Auto path chains image-prompt generation for the freshly published recap.
    expect(imagePromptMock).toHaveBeenCalledWith(admin, "s-auto");
    // …and then requests the Leonardo render of that prompt.
    expect(renderMock).toHaveBeenCalledWith(admin, "s-auto");
  });

  it("still returns success when the image RENDER request fails (isolated)", async () => {
    chatMock.mockResolvedValue({
      content: "Mexico edged Canada 2-1.",
      model: "test/model",
      promptTokens: 1,
      completionTokens: 2,
    });
    renderMock.mockRejectedValue(new Error("leonardo boom"));
    const admin = makeAdmin({
      existing: null,
      match: FINAL_MATCH,
      events: [GOAL],
      insertedId: "s-auto",
    });
    const result = await generateMatchSummary(admin as never, "m1");
    expect(result).toEqual({ generated: true, summaryId: "s-auto" });
  });

  it("still returns success when image-prompt generation fails (isolated)", async () => {
    chatMock.mockResolvedValue({
      content: "Mexico edged Canada 2-1.",
      model: "test/model",
      promptTokens: 1,
      completionTokens: 2,
    });
    imagePromptMock.mockRejectedValue(new Error("image prompt boom"));
    const admin = makeAdmin({
      existing: null,
      match: FINAL_MATCH,
      events: [GOAL],
      insertedId: "s-auto",
    });
    const result = await generateMatchSummary(admin as never, "m1");
    expect(result).toEqual({ generated: true, summaryId: "s-auto" });
  });

  it("treats a unique-violation on insert as already-exists (concurrent race)", async () => {
    chatMock.mockResolvedValue({
      content: "Recap.",
      model: "test/model",
      promptTokens: null,
      completionTokens: null,
    });
    const admin = makeAdmin({
      existing: null,
      match: FINAL_MATCH,
      events: [GOAL],
      insertError: { code: "23505", message: "duplicate key" },
    });
    const result = await generateMatchSummary(admin as never, "m1");
    expect(result).toEqual({ generated: false, reason: "exists" });
  });

  it("skips a final match with no recorded events (no network, no insert)", async () => {
    const admin = makeAdmin({ existing: null, match: FINAL_MATCH, events: [] });
    const result = await generateMatchSummary(admin as never, "m1");
    expect(result).toEqual({ generated: false, reason: "no-events" });
    expect(chatMock).not.toHaveBeenCalled();
    expect(admin.insert).not.toHaveBeenCalled();
  });
});

describe("generateMatchSummary (regenerate mode)", () => {
  it("always inserts a NEW non-active draft even when a version exists", async () => {
    chatMock.mockResolvedValue({
      content: "Dramatic recap.",
      model: "test/model",
      promptTokens: 5,
      completionTokens: 6,
    });
    const admin = makeAdmin({
      existing: { id: "s1" }, // a version already exists — must NOT block
      match: FINAL_MATCH,
      events: [GOAL],
      insertedId: "s-draft",
    });
    const result = await generateMatchSummary(admin as never, "m1", {
      mode: "regenerate",
      style: { key: "dramatic", instruction: "Lean into the drama." },
    });
    expect(result).toEqual({ generated: true, summaryId: "s-draft" });
    expect(admin.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        match_id: "m1",
        style_key: "dramatic",
        style_instruction: "Lean into the drama.",
        is_active: false,
      }),
    );
    // Regenerate produces a DRAFT — it must NOT auto-generate an image prompt
    // or request a render.
    expect(imagePromptMock).not.toHaveBeenCalled();
    expect(renderMock).not.toHaveBeenCalled();
  });

  it("does not run the existence check at all in regenerate mode", async () => {
    chatMock.mockResolvedValue({
      content: "Recap.",
      model: "test/model",
      promptTokens: null,
      completionTokens: null,
    });
    const admin = makeAdmin({
      existing: [{ id: "s1" }, { id: "s2" }],
      match: FINAL_MATCH,
      events: [GOAL],
    });
    const result = await generateMatchSummary(admin as never, "m1", {
      mode: "regenerate",
      style: { key: "custom", instruction: "Focus on the keeper." },
    });
    expect(result.generated).toBe(true);
  });

  it("still honours the no-events / not-final / no-key gates", async () => {
    // no-key
    envMock.openrouterApiKey = null;
    let admin = makeAdmin({ match: FINAL_MATCH, events: [GOAL] });
    expect(await generateMatchSummary(admin as never, "m1", { mode: "regenerate" })).toEqual({
      generated: false,
      reason: "no-key",
    });

    // not-final
    envMock.openrouterApiKey = "test-key";
    admin = makeAdmin({ match: { ...FINAL_MATCH, status: "live" }, events: [GOAL] });
    expect(await generateMatchSummary(admin as never, "m1", { mode: "regenerate" })).toEqual({
      generated: false,
      reason: "not-final",
    });

    // no-events
    admin = makeAdmin({ match: FINAL_MATCH, events: [] });
    expect(await generateMatchSummary(admin as never, "m1", { mode: "regenerate" })).toEqual({
      generated: false,
      reason: "no-events",
    });
  });
});

describe("buildSummaryPrompt", () => {
  it("instructs English output and includes the score and events", () => {
    const prompt = buildSummaryPrompt(FINAL_MATCH, [GOAL]);
    expect(prompt.system).toContain("English");
    expect(prompt.user).toContain("Mexico 2 - 1 Canada");
    expect(prompt.user).toContain("Lozano");
    expect(prompt.user).toContain("Goal");
  });

  it("notes when no events were recorded", () => {
    const prompt = buildSummaryPrompt(FINAL_MATCH, []);
    expect(prompt.user).toContain("no individual events");
  });

  it("appends a style instruction after the grounding constraints", () => {
    const instruction = "Lean into a dramatic tone.";
    const prompt = buildSummaryPrompt(FINAL_MATCH, [GOAL], instruction);
    expect(prompt.system).toContain(instruction);
    // The style guidance is appended AFTER the "never invent" grounding rule.
    expect(prompt.system.indexOf("never invent")).toBeLessThan(prompt.system.indexOf(instruction));
  });

  it("ignores an empty/whitespace style instruction", () => {
    const base = buildSummaryPrompt(FINAL_MATCH, [GOAL]);
    const blank = buildSummaryPrompt(FINAL_MATCH, [GOAL], "   ");
    expect(blank.system).toBe(base.system);
  });
});

describe("generatePendingSummaries", () => {
  // Records the filters applied to the `matches` query so the batch's scope is
  // assertable, and serves a fixed set of finals + existing summaries.
  // Serves both the batch queries (finals window, existing-summaries anti-join)
  // and the per-match reads generateMatchSummary makes for each candidate.
  function makeBatchAdmin(opts: {
    finals: { id: string }[];
    existingSummaries?: { match_id: string }[];
    match?: Record<string, unknown> | null;
    events?: unknown[];
  }) {
    const matchFilters: Record<string, unknown> = {};
    const matchRow = opts.match ?? {
      home_team: "Mexico",
      away_team: "Poland",
      home_score: 2,
      away_score: 1,
      status: "final",
      stage: "group",
      group_code: "A",
    };
    const from = vi.fn((table: string) => {
      if (table === "matches") {
        const chain: Record<string, unknown> = {
          select: () => chain,
          eq: (col: string, val: unknown) => {
            matchFilters[col] = val;
            return chain;
          },
          order: () => chain,
          limit: async () => ({ data: opts.finals, error: null }),
          // Per-match read inside generateMatchSummary.
          maybeSingle: async () => ({ data: matchRow, error: null }),
        };
        return chain;
      }
      if (table === "match_summaries") {
        const chain: Record<string, unknown> = {
          select: () => chain,
          // Batch anti-join.
          in: async () => ({ data: opts.existingSummaries ?? [], error: null }),
          // Per-match existence check: .eq(...).limit(1) — always empty here,
          // since the batch already filtered out matches that have a summary.
          eq: () => ({ limit: async () => ({ data: [], error: null }) }),
          insert: () => ({
            select: () => ({ single: async () => ({ data: { id: "s-new" }, error: null }) }),
          }),
        };
        return chain;
      }
      if (table === "match_events") {
        return {
          select: () => ({
            eq: () => ({ order: async () => ({ data: opts.events ?? [GOAL], error: null }) }),
          }),
        };
      }
      throw new Error(`unexpected from(${table})`);
    });
    return { from, matchFilters };
  }

  it("no-ops without DB access when the key is unset", async () => {
    envMock.openrouterApiKey = null;
    const admin = makeAdmin({});
    const result = await generatePendingSummaries(admin as never);
    expect(result).toEqual({
      candidates: 0,
      generated: 0,
      skipped: 0,
      errors: 0,
      reasons: {},
    });
    expect(admin.from).not.toHaveBeenCalled();
  });

  // Without this the batch is one global window over every league's finals, so
  // a league whose fixtures kicked off most recently starves the others: the
  // older leagues' recaps are never even considered.
  it("scopes the batch to one competition when given one", async () => {
    const admin = makeBatchAdmin({ finals: [] });
    await generatePendingSummaries(admin as never, { competitionId: "comp-1" });
    expect(admin.matchFilters.competition_id).toBe("comp-1");
    expect(admin.matchFilters.status).toBe("final");
  });

  it("leaves the batch global when no competition is given", async () => {
    const admin = makeBatchAdmin({ finals: [] });
    await generatePendingSummaries(admin as never);
    expect(admin.matchFilters.competition_id).toBeUndefined();
  });

  // A failing OpenRouter key made every match error, but the cron only ever
  // read `generated`, so a dead integration looked exactly like "nothing to do".
  it("counts a per-match failure as an error and keeps going", async () => {
    const admin = makeBatchAdmin({ finals: [{ id: "m1" }, { id: "m2" }] });
    chatMock.mockRejectedValueOnce(new Error("OpenRouter 401: no credit"));
    chatMock.mockResolvedValueOnce({
      content: "Recap.",
      model: "test/model",
      promptTokens: 1,
      completionTokens: 2,
    });

    const result = await generatePendingSummaries(admin as never);

    expect(result.candidates).toBe(2);
    expect(result.errors).toBe(1);
    expect(result.reasons.error).toBe(1);
  });

  // The reason breakdown is what makes a silent pass diagnosable: "20 candidates,
  // 0 generated" says nothing; "18 no-events, 2 errors" says where to look.
  it("tallies why each match was skipped", async () => {
    // No ingested events -> the recap is not worth generating, and the pass
    // should say so rather than reporting a bare zero.
    const admin = makeBatchAdmin({ finals: [{ id: "m1" }], events: [] });

    const result = await generatePendingSummaries(admin as never);

    expect(result.generated).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.reasons["no-events"]).toBe(1);
  });

  it("does not consider a match that already has a summary", async () => {
    const admin = makeBatchAdmin({
      finals: [{ id: "m1" }, { id: "m2" }],
      existingSummaries: [{ match_id: "m1" }],
    });

    const result = await generatePendingSummaries(admin as never);

    expect(result.candidates).toBe(1);
  });
});
