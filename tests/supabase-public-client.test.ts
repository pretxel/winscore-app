import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

// The public client exists to be callable from inside `use cache`, which
// forbids reading cookies or headers. That guarantee is structural, so it is
// asserted against the source rather than through a mock that could drift.

const SOURCE = readFileSync(join(process.cwd(), "lib/supabase/public.ts"), "utf8");

describe("public Supabase client source", () => {
  it("never reaches for request-scoped APIs", () => {
    expect(SOURCE).not.toMatch(/next\/headers/);
    expect(SOURCE).not.toMatch(/\bcookies\(/);
    expect(SOURCE).not.toMatch(/\bheaders\(/);
  });

  it("uses the anon key, never the service role", () => {
    expect(SOURCE).toMatch(/supabaseAnonKey/);
    expect(SOURCE).not.toMatch(/serviceRole/i);
  });
});

describe("createPublicSupabaseClient", () => {
  it("creates a stateless client and forwards the league header when given one", async () => {
    const createClient = vi.fn((..._args: unknown[]) => ({}));
    vi.doMock("@supabase/supabase-js", () => ({ createClient }));
    vi.doMock("server-only", () => ({}));
    vi.doMock("@/lib/env", () => ({
      env: { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon-key" },
    }));

    const { createPublicSupabaseClient } = await import("@/lib/supabase/public");

    createPublicSupabaseClient();
    const [url, key, opts] = createClient.mock.calls[0] as unknown as [
      string,
      string,
      Record<string, unknown>,
    ];
    expect(url).toBe("https://example.supabase.co");
    expect(key).toBe("anon-key");
    expect(opts).toMatchObject({
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    expect(opts).not.toHaveProperty("global");

    createPublicSupabaseClient("la-liga-2026-2027");
    const scoped = createClient.mock.calls[1]?.[2] as unknown as {
      global?: { headers?: Record<string, string> };
    };
    expect(scoped.global?.headers?.["x-league"]).toBe("la-liga-2026-2027");

    vi.doUnmock("@supabase/supabase-js");
    vi.doUnmock("@/lib/env");
  });
});
