import { describe, it, expect, vi, beforeEach } from "vitest";

// Controlled by each test.
let mockUser: { id: string } | null;
let existingRow: { id: string } | null;
let writeError: { message: string } | null;
let countValue: number | null;
const calls: { method: string; args: unknown[] }[] = [];

// Chainable stand-in for the space_likes query builder. `maybeSingle` resolves
// to the existing-row check; awaiting resolves to a count read (after select) or
// a write result (after insert/delete).
function builder() {
  let sawSelect = false;
  const b: Record<string, unknown> = {};
  const chain =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
      if (method === "select") sawSelect = true;
      return b;
    };
  for (const m of ["select", "eq", "insert", "delete"]) b[m] = chain(m);
  b.maybeSingle = () => Promise.resolve({ data: existingRow });
  b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve(sawSelect ? { count: countValue } : { error: writeError }).then(res, rej);
  return b;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mockUser } }) },
    from: () => builder(),
  }),
}));

import { toggleLike } from "./toggle-like";

beforeEach(() => {
  mockUser = { id: "user_1" };
  existingRow = null;
  writeError = null;
  countValue = 0;
  calls.length = 0;
});

describe("toggleLike", () => {
  it("rejects a non-uuid spaceId before touching the DB", async () => {
    const res = await toggleLike({ spaceId: "not-a-uuid" });
    expect(res).toEqual({ ok: false, error: "INVALID_INPUT" });
    expect(calls).toEqual([]);
  });

  it("returns UNAUTHENTICATED when there is no user", async () => {
    mockUser = null;
    const res = await toggleLike({ spaceId: "550e8400-e29b-41d4-a716-446655440000" });
    expect(res).toEqual({ ok: false, error: "UNAUTHENTICATED" });
  });

  it("likes when no row exists and returns the fresh count", async () => {
    existingRow = null;
    countValue = 5;
    const res = await toggleLike({ spaceId: "550e8400-e29b-41d4-a716-446655440000" });
    expect(res).toEqual({ ok: true, liked: true, likesCount: 5 });
    expect(calls.some((c) => c.method === "insert")).toBe(true);
    expect(calls.some((c) => c.method === "delete")).toBe(false);
  });

  it("unlikes when a row exists", async () => {
    existingRow = { id: "like_1" };
    countValue = 4;
    const res = await toggleLike({ spaceId: "550e8400-e29b-41d4-a716-446655440000" });
    expect(res).toEqual({ ok: true, liked: false, likesCount: 4 });
    expect(calls.some((c) => c.method === "delete")).toBe(true);
    expect(calls.some((c) => c.method === "insert")).toBe(false);
  });

  it("surfaces a write failure as FAILED", async () => {
    writeError = { message: "boom" };
    const res = await toggleLike({ spaceId: "550e8400-e29b-41d4-a716-446655440000" });
    expect(res).toEqual({ ok: false, error: "FAILED", message: "boom" });
  });
});
