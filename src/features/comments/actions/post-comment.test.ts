import { describe, it, expect, vi, beforeEach } from "vitest";

let mockUser: { id: string } | null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mockUser } }) },
    // Not reached by the validation/auth tests below.
    from: () => {
      throw new Error("DB should not be touched for invalid/unauth input");
    },
  }),
}));

import { postComment } from "./post-comment";

const SPACE = "550e8400-e29b-41d4-a716-446655440000";

beforeEach(() => {
  mockUser = { id: "u1" };
});

describe("postComment (guard rails)", () => {
  it("rejects empty content before any DB access", async () => {
    expect(await postComment({ spaceId: SPACE, content: "   " })).toEqual({
      ok: false,
      error: "INVALID_INPUT",
    });
  });
  it("rejects a non-uuid spaceId", async () => {
    expect(await postComment({ spaceId: "nope", content: "hi" })).toEqual({
      ok: false,
      error: "INVALID_INPUT",
    });
  });
  it("returns UNAUTHENTICATED without a user", async () => {
    mockUser = null;
    expect(await postComment({ spaceId: SPACE, content: "hi" })).toEqual({
      ok: false,
      error: "UNAUTHENTICATED",
    });
  });
});
