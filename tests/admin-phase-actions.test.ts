import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Every phase action must refuse a non-admin before any write, and closing
// must go through close_phase() so winners are frozen in the same transaction.

const rpcMock = vi.fn();
const adminFromMock = vi.fn();
let isAdmin = false;

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } } })) },
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { is_admin: isAdmin } }) }),
      }),
    })),
    rpc: rpcMock,
  })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: vi.fn(() => ({ from: adminFromMock })),
}));

const COMP = "11111111-1111-4111-8111-111111111111";
const PHASE = "22222222-2222-4222-8222-222222222222";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  f.set("locale", "en");
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

beforeEach(() => {
  isAdmin = false;
  rpcMock.mockReset();
  rpcMock.mockResolvedValue({ data: 3, error: null });
  adminFromMock.mockReset();
});

afterEach(() => vi.clearAllMocks());

describe("phase admin actions", () => {
  it("refuses a non-admin before touching the database", async () => {
    const { closePhase, createScheme } = await import(
      "@/app/[locale]/(admin)/admin/competitions/[id]/phases/actions"
    );
    await expect(closePhase(fd({ competition_id: COMP, phase_id: PHASE }))).rejects.toThrow(
      /Admin only/,
    );
    await expect(
      createScheme(fd({ competition_id: COMP, scheme_key: "seven", label: "Seven" })),
    ).rejects.toThrow(/Admin only/);
    expect(rpcMock).not.toHaveBeenCalled();
    expect(adminFromMock).not.toHaveBeenCalled();
  });

  it("closes through close_phase() as the admin and reports the winners written", async () => {
    isAdmin = true;
    const { closePhase } = await import(
      "@/app/[locale]/(admin)/admin/competitions/[id]/phases/actions"
    );
    await expect(closePhase(fd({ competition_id: COMP, phase_id: PHASE }))).rejects.toThrow(
      /REDIRECT:.*phases\?status=phase-closed%3A3/,
    );
    expect(rpcMock).toHaveBeenCalledWith("close_phase", { p_phase_id: PHASE });
  });

  it("rejects a malformed phase key without writing", async () => {
    isAdmin = true;
    const { createScheme } = await import(
      "@/app/[locale]/(admin)/admin/competitions/[id]/phases/actions"
    );
    await expect(
      createScheme(fd({ competition_id: COMP, scheme_key: "Not Valid!", label: "x" })),
    ).rejects.toThrow();
    expect(adminFromMock).not.toHaveBeenCalled();
  });
});
