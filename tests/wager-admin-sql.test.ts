import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20260724000000_wager_admin_config_access.sql",
  "utf8",
);

describe("wager admin config migration", () => {
  it("relaxes configure_pool_wager to allow admins", () => {
    expect(sql).toContain("create or replace function public.configure_pool_wager");
    expect(sql).toMatch(/is_group_owner\(p_group_id\)\s+or\s+public\.is_admin\(\)/);
  });
  it("relaxes initialize_wager_round to allow admins", () => {
    expect(sql).toContain("create or replace function public.initialize_wager_round");
  });
  it("keeps both guards raising when neither owner nor admin", () => {
    expect((sql.match(/raise exception/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
