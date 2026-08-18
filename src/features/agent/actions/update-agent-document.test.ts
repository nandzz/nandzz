import { describe, it, expect, vi, beforeEach } from "vitest";

const DOC_ID = "11111111-1111-4111-8111-111111111111";

let mockUser: { id: string } | null;
let updateResult: { data: unknown; error: { message: string } | null };
let capturedUpdate: Record<string, unknown> | null;

function serverBuilder() {
  const b: Record<string, unknown> = {};
  b.update = (patch: Record<string, unknown>) => {
    capturedUpdate = patch;
    const u: Record<string, unknown> = {};
    u.eq = () => u;
    u.select = () => u;
    u.single = async () => updateResult;
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

import { updateAgentDocument } from "./update-agent-document";

beforeEach(() => {
  mockUser = { id: "user_1" };
  updateResult = { data: { id: DOC_ID, title: "New" }, error: null };
  capturedUpdate = null;
});

describe("updateAgentDocument", () => {
  it("rejects a non-uuid id", async () => {
    const res = await updateAgentDocument({ id: "nope", title: "x" });
    expect(res).toEqual({ ok: false, error: "INVALID_INPUT" });
  });

  it("returns UNAUTHENTICATED without a user", async () => {
    mockUser = null;
    const res = await updateAgentDocument({ id: DOC_ID, title: "x" });
    expect(res).toEqual({ ok: false, error: "UNAUTHENTICATED" });
  });

  it("returns NOTHING_TO_UPDATE when no editable fields are supplied", async () => {
    const res = await updateAgentDocument({ id: DOC_ID });
    expect(res).toEqual({ ok: false, error: "NOTHING_TO_UPDATE" });
  });

  it("writes only the supplied fields (preserving the rest)", async () => {
    const res = await updateAgentDocument({ id: DOC_ID, title: "New", content: "Body" });
    expect(res.ok).toBe(true);
    expect(capturedUpdate).toEqual({ title: "New", content: "Body" });
  });

  it("returns FAILED when the update errors", async () => {
    updateResult = { data: null, error: { message: "boom" } };
    const res = await updateAgentDocument({ id: DOC_ID, title: "New" });
    expect(res).toEqual({ ok: false, error: "FAILED", message: "boom" });
  });
});
