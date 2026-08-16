import { describe, it, expect, vi, beforeEach } from "vitest";

let mockUser: { id: string } | null;
let existing: { comment_id: string } | null;
let writeError: { message: string } | null;
let countValue: number | null;
const calls: string[] = [];

function builder() {
  let sawSelect = false;
  const b: Record<string, unknown> = {};
  const chain =
    (m: string) =>
    () => {
      calls.push(m);
      if (m === "select") sawSelect = true;
      return b;
    };
  for (const m of ["select", "eq", "insert", "delete"]) b[m] = chain(m);
  b.maybeSingle = () => Promise.resolve({ data: existing });
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

import { toggleCommentLike } from "./toggle-comment-like";

const CID = "550e8400-e29b-41d4-a716-446655440000";

beforeEach(() => {
  mockUser = { id: "u1" };
  existing = null;
  writeError = null;
  countValue = 0;
  calls.length = 0;
});

describe("toggleCommentLike", () => {
  it("rejects a non-uuid commentId", async () => {
    expect(await toggleCommentLike({ commentId: "x" })).toEqual({ ok: false, error: "INVALID_INPUT" });
  });
  it("UNAUTHENTICATED without a user", async () => {
    mockUser = null;
    expect(await toggleCommentLike({ commentId: CID })).toEqual({ ok: false, error: "UNAUTHENTICATED" });
  });
  it("likes when no row exists", async () => {
    countValue = 3;
    const res = await toggleCommentLike({ commentId: CID });
    expect(res).toEqual({ ok: true, liked: true, likesCount: 3 });
    expect(calls).toContain("insert");
  });
  it("unlikes when a row exists", async () => {
    existing = { comment_id: CID };
    countValue = 2;
    const res = await toggleCommentLike({ commentId: CID });
    expect(res).toEqual({ ok: true, liked: false, likesCount: 2 });
    expect(calls).toContain("delete");
  });
});
