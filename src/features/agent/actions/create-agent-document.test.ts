import { describe, it, expect, vi, beforeEach } from "vitest";

let mockUser: { id: string } | null;
let insertResult: { data: unknown; error: { message: string } | null };
let capturedInsert: Record<string, unknown> | null;

function serverBuilder() {
  const b: Record<string, unknown> = {};
  b.insert = (row: Record<string, unknown>) => {
    capturedInsert = row;
    const u: Record<string, unknown> = {};
    u.select = () => u;
    u.single = async () => insertResult;
    return u;
  };
  return b;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mockUser } }) },
    from: () => serverBuilder(),
  }),
}));

import { createAgentDocument } from "./create-agent-document";

beforeEach(() => {
  mockUser = { id: "user_1" };
  insertResult = { data: { id: "doc_1", title: "Hi" }, error: null };
  capturedInsert = null;
});

describe("createAgentDocument", () => {
  it("returns INVALID_INPUT for a bad field type", async () => {
    const res = await createAgentDocument({ visibility: "nope" } as never);
    expect(res).toEqual({ ok: false, error: "INVALID_INPUT" });
  });

  it("returns UNAUTHENTICATED without a user", async () => {
    mockUser = null;
    const res = await createAgentDocument({ title: "Hi", content: "yo" });
    expect(res).toEqual({ ok: false, error: "UNAUTHENTICATED" });
  });

  it("applies route defaults and stamps user_id", async () => {
    const res = await createAgentDocument({ title: "Hi", content: "yo" });
    expect(res.ok).toBe(true);
    expect(capturedInsert).toEqual({
      user_id: "user_1",
      title: "Hi",
      content: "yo",
      visibility: "public",
      status: "active",
      is_sensitive: false,
      sort_order: 100,
    });
  });

  it("returns FAILED when the insert errors", async () => {
    insertResult = { data: null, error: { message: "boom" } };
    const res = await createAgentDocument({ title: "Hi", content: "yo" });
    expect(res).toEqual({ ok: false, error: "FAILED", message: "boom" });
  });
});
