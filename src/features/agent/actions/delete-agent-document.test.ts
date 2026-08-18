import { describe, it, expect, vi, beforeEach } from "vitest";

const DOC_ID = "11111111-1111-4111-8111-111111111111";

let mockUser: { id: string } | null;
let deleteError: { message: string } | null;

function serverBuilder() {
  const b: Record<string, unknown> = {};
  b.delete = () => {
    const u: Record<string, unknown> = {};
    let eqCalls = 0;
    u.eq = () => {
      eqCalls += 1;
      // id, user_id — resolve after the second .eq()
      return eqCalls >= 2 ? Promise.resolve({ error: deleteError }) : u;
    };
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

import { deleteAgentDocument } from "./delete-agent-document";

beforeEach(() => {
  mockUser = { id: "user_1" };
  deleteError = null;
});

describe("deleteAgentDocument", () => {
  it("rejects a non-uuid id", async () => {
    expect(await deleteAgentDocument("nope")).toEqual({ ok: false, error: "INVALID_INPUT" });
  });

  it("returns UNAUTHENTICATED without a user", async () => {
    mockUser = null;
    expect(await deleteAgentDocument(DOC_ID)).toEqual({ ok: false, error: "UNAUTHENTICATED" });
  });

  it("returns ok on success", async () => {
    expect(await deleteAgentDocument(DOC_ID)).toEqual({ ok: true });
  });

  it("returns FAILED when the delete errors", async () => {
    deleteError = { message: "boom" };
    expect(await deleteAgentDocument(DOC_ID)).toEqual({
      ok: false,
      error: "FAILED",
      message: "boom",
    });
  });
});
