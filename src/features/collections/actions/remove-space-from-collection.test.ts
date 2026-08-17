import { describe, it, expect, vi, beforeEach } from "vitest";

const COLLECTION_ID = "33333333-3333-4333-8333-333333333333";
const SPACE_ID = "44444444-4444-4444-8444-444444444444";

let mockUser: { id: string } | null;
let deleteResult: { error: { message: string } | null };
let eqFilters: Array<[string, unknown]>;

function builder() {
  const b: Record<string, unknown> = {};
  b.delete = () => b;
  b.eq = (col: string, val: unknown) => {
    eqFilters.push([col, val]);
    return b;
  };
  b.then = (resolve: (v: unknown) => unknown) => resolve(deleteResult);
  return b;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mockUser } }) },
    from: () => builder(),
  }),
}));

import { removeSpaceFromCollection } from "./remove-space-from-collection";

beforeEach(() => {
  mockUser = { id: "user_1" };
  deleteResult = { error: null };
  eqFilters = [];
});

describe("removeSpaceFromCollection", () => {
  it("rejects non-uuid input", async () => {
    const res = await removeSpaceFromCollection({ collectionId: "x", spaceId: "y" });
    expect(res).toEqual({ ok: false, error: "INVALID_INPUT" });
  });

  it("returns UNAUTHENTICATED without a user", async () => {
    mockUser = null;
    const res = await removeSpaceFromCollection({ collectionId: COLLECTION_ID, spaceId: SPACE_ID });
    expect(res).toEqual({ ok: false, error: "UNAUTHENTICATED" });
  });

  it("deletes the join row scoped to both ids", async () => {
    const res = await removeSpaceFromCollection({ collectionId: COLLECTION_ID, spaceId: SPACE_ID });
    expect(res).toEqual({ ok: true });
    expect(eqFilters).toEqual([
      ["collection_id", COLLECTION_ID],
      ["space_id", SPACE_ID],
    ]);
  });

  it("surfaces a DB error as FAILED", async () => {
    deleteResult = { error: { message: "boom" } };
    const res = await removeSpaceFromCollection({ collectionId: COLLECTION_ID, spaceId: SPACE_ID });
    expect(res).toEqual({ ok: false, error: "FAILED", message: "boom" });
  });
});
