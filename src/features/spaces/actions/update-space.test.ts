import { describe, it, expect, vi, beforeEach } from "vitest";

const SPACE_ID = "55555555-5555-4555-8555-555555555555";

let mockUser: { id: string } | null;
let updateResult: { error: { message: string } | null };
let updatedFields: Record<string, unknown> | null;
let eqFilter: [string, unknown] | null;

function builder() {
  const b: Record<string, unknown> = {};
  b.update = (fields: Record<string, unknown>) => {
    updatedFields = fields;
    return b;
  };
  b.eq = (col: string, val: unknown) => {
    eqFilter = [col, val];
    return Promise.resolve(updateResult);
  };
  return b;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mockUser } }) },
    from: () => builder(),
  }),
}));

import { updateSpace } from "./update-space";

beforeEach(() => {
  mockUser = { id: "user_1" };
  updateResult = { error: null };
  updatedFields = null;
  eqFilter = null;
});

describe("updateSpace", () => {
  it("rejects a non-uuid id", async () => {
    const res = await updateSpace({ id: "nope", title: "x" });
    expect(res).toEqual({ ok: false, error: "INVALID_INPUT" });
  });

  it("returns UNAUTHENTICATED without a user", async () => {
    mockUser = null;
    const res = await updateSpace({ id: SPACE_ID, title: "x" });
    expect(res).toEqual({ ok: false, error: "UNAUTHENTICATED" });
  });

  it("is a no-op (ok) when only the id is supplied", async () => {
    const res = await updateSpace({ id: SPACE_ID });
    expect(res).toEqual({ ok: true });
    expect(updatedFields).toBeNull();
  });

  it("updates only the provided fields, scoped to the id", async () => {
    const res = await updateSpace({ id: SPACE_ID, title: "New", is_public: true });
    expect(res).toEqual({ ok: true });
    expect(updatedFields).toEqual({ title: "New", is_public: true });
    expect(eqFilter).toEqual(["id", SPACE_ID]);
  });

  it("strips unknown keys before writing", async () => {
    await updateSpace({ id: SPACE_ID, title: "New", bogus: 1 } as never);
    expect(updatedFields).toEqual({ title: "New" });
  });

  it("surfaces a DB error as FAILED", async () => {
    updateResult = { error: { message: "boom" } };
    const res = await updateSpace({ id: SPACE_ID, title: "New" });
    expect(res).toEqual({ ok: false, error: "FAILED", message: "boom" });
  });
});
