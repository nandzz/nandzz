import { describe, it, expect, vi, beforeEach } from "vitest";

let mockUser: { id: string } | null;
let updateError: { message: string } | null;
const captured: { ids?: unknown; userId?: unknown } = {};

function serverBuilder() {
  const b: Record<string, unknown> = {};
  b.update = () => b;
  b.in = (_col: string, ids: unknown) => {
    captured.ids = ids;
    return b;
  };
  b.eq = (_col: string, userId: unknown) => {
    captured.userId = userId;
    return Promise.resolve({ error: updateError });
  };
  return b;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mockUser } }) },
    from: () => serverBuilder(),
  }),
}));

import { markNotificationsRead } from "./mark-notifications-read";

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  mockUser = { id: "user_1" };
  updateError = null;
  delete captured.ids;
  delete captured.userId;
});

describe("markNotificationsRead", () => {
  it("rejects invalid (non-uuid) ids", async () => {
    expect(await markNotificationsRead(["nope"])).toEqual({
      ok: false,
      error: "INVALID_INPUT",
    });
  });

  it("rejects an empty batch", async () => {
    expect(await markNotificationsRead([])).toEqual({
      ok: false,
      error: "INVALID_INPUT",
    });
  });

  it("returns UNAUTHENTICATED without a user", async () => {
    mockUser = null;
    expect(await markNotificationsRead([ID_A])).toEqual({
      ok: false,
      error: "UNAUTHENTICATED",
    });
  });

  it("marks the batch read, scoped to the user", async () => {
    const res = await markNotificationsRead([ID_A, ID_B]);
    expect(res).toEqual({ ok: true });
    expect(captured.ids).toEqual([ID_A, ID_B]);
    expect(captured.userId).toBe("user_1");
  });

  it("returns FAILED when the update errors", async () => {
    updateError = { message: "boom" };
    expect(await markNotificationsRead([ID_A])).toEqual({
      ok: false,
      error: "FAILED",
      message: "boom",
    });
  });
});
