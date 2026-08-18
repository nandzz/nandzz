import { describe, it, expect, vi, beforeEach } from "vitest";

let mockUser: { id: string } | null;
let deleteError: { message: string } | null;
const captured: { jobId?: unknown; userId?: unknown } = {};

function serverBuilder() {
  const b: Record<string, unknown> = {};
  b.delete = () => b;
  let eqCalls = 0;
  b.eq = (_col: string, val: unknown) => {
    eqCalls += 1;
    if (eqCalls === 1) captured.jobId = val;
    else {
      captured.userId = val;
      return Promise.resolve({ error: deleteError });
    }
    return b;
  };
  return b;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mockUser } }) },
    from: () => serverBuilder(),
  }),
}));

import { deleteAiJob } from "./delete-ai-job";

const JOB_ID = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  mockUser = { id: "user_1" };
  deleteError = null;
  delete captured.jobId;
  delete captured.userId;
});

describe("deleteAiJob", () => {
  it("rejects a non-uuid id", async () => {
    expect(await deleteAiJob("nope")).toEqual({
      ok: false,
      error: "INVALID_INPUT",
    });
  });

  it("returns UNAUTHENTICATED without a user", async () => {
    mockUser = null;
    expect(await deleteAiJob(JOB_ID)).toEqual({
      ok: false,
      error: "UNAUTHENTICATED",
    });
  });

  it("deletes the job scoped to the owner", async () => {
    const res = await deleteAiJob(JOB_ID);
    expect(res).toEqual({ ok: true });
    expect(captured.jobId).toBe(JOB_ID);
    expect(captured.userId).toBe("user_1");
  });

  it("returns FAILED when the delete errors", async () => {
    deleteError = { message: "boom" };
    expect(await deleteAiJob(JOB_ID)).toEqual({
      ok: false,
      error: "FAILED",
      message: "boom",
    });
  });
});
