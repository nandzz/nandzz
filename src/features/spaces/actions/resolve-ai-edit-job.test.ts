import { describe, it, expect, vi, beforeEach } from "vitest";

const JOB_ID = "66666666-6666-4666-8666-666666666666";

let mockUser: { id: string } | null;
let deleteResult: { error: { message: string } | null };
let eqFilter: [string, unknown] | null;
let deletedTable: string | null;

function builder() {
  const b: Record<string, unknown> = {};
  b.delete = () => b;
  b.eq = (col: string, val: unknown) => {
    eqFilter = [col, val];
    return Promise.resolve(deleteResult);
  };
  return b;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mockUser } }) },
    from: (table: string) => {
      deletedTable = table;
      return builder();
    },
  }),
}));

import { resolveAiEditJob } from "./resolve-ai-edit-job";

beforeEach(() => {
  mockUser = { id: "user_1" };
  deleteResult = { error: null };
  eqFilter = null;
  deletedTable = null;
});

describe("resolveAiEditJob", () => {
  it("rejects a non-uuid jobId", async () => {
    const res = await resolveAiEditJob({ jobId: "nope" });
    expect(res).toEqual({ ok: false, error: "INVALID_INPUT" });
  });

  it("returns UNAUTHENTICATED without a user", async () => {
    mockUser = null;
    const res = await resolveAiEditJob({ jobId: JOB_ID });
    expect(res).toEqual({ ok: false, error: "UNAUTHENTICATED" });
  });

  it("deletes the job row scoped to its id", async () => {
    const res = await resolveAiEditJob({ jobId: JOB_ID });
    expect(res).toEqual({ ok: true });
    expect(deletedTable).toBe("ai_edit_jobs");
    expect(eqFilter).toEqual(["id", JOB_ID]);
  });

  it("surfaces a DB error as FAILED", async () => {
    deleteResult = { error: { message: "boom" } };
    const res = await resolveAiEditJob({ jobId: JOB_ID });
    expect(res).toEqual({ ok: false, error: "FAILED", message: "boom" });
  });
});
