import { describe, it, expect, vi, beforeEach } from "vitest";

let mockUser: { id: string } | null;
let insertResult: { data: unknown; error: { message: string } | null };
let insertedPayload: Record<string, unknown> | null;

function builder() {
  const b: Record<string, unknown> = {};
  b.insert = (payload: Record<string, unknown>) => {
    insertedPayload = payload;
    return b;
  };
  b.select = () => b;
  b.single = () => Promise.resolve(insertResult);
  return b;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mockUser } }) },
    from: () => builder(),
  }),
}));

import { createCollection } from "./create-collection";

beforeEach(() => {
  mockUser = { id: "user_1" };
  insertResult = { data: { id: "c1", name: "Fav" }, error: null };
  insertedPayload = null;
});

describe("createCollection", () => {
  it("rejects an empty name", async () => {
    const res = await createCollection({ name: "   " });
    expect(res).toEqual({ ok: false, error: "INVALID_INPUT" });
  });

  it("returns UNAUTHENTICATED without a user", async () => {
    mockUser = null;
    const res = await createCollection({ name: "Fav" });
    expect(res).toEqual({ ok: false, error: "UNAUTHENTICATED" });
  });

  it("defaults is_public to false (privacy invariant)", async () => {
    await createCollection({ name: "Fav" });
    expect(insertedPayload).toMatchObject({ name: "Fav", is_public: false, user_id: "user_1" });
  });

  it("honors an explicit is_public and returns the new collection", async () => {
    const res = await createCollection({ name: "Fav", isPublic: true });
    expect(insertedPayload).toMatchObject({ is_public: true });
    expect(res).toEqual({ ok: true, collection: { id: "c1", name: "Fav" } });
  });

  it("surfaces a DB error as FAILED", async () => {
    insertResult = { data: null, error: { message: "boom" } };
    const res = await createCollection({ name: "Fav" });
    expect(res).toEqual({ ok: false, error: "FAILED", message: "boom" });
  });
});
