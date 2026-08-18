import { describe, it, expect, vi, beforeEach } from "vitest";

let mockUser: { id: string } | null;
let listResult: { data: unknown; error: { message: string } | null };

function serverBuilder() {
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.eq = () => b;
  let orderCalls = 0;
  b.order = () => {
    orderCalls += 1;
    return orderCalls >= 2 ? Promise.resolve(listResult) : b;
  };
  return b;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mockUser } }) },
    from: () => serverBuilder(),
  }),
}));

import { loadAgentDocuments } from "./load-agent-documents";

beforeEach(() => {
  mockUser = { id: "user_1" };
  listResult = { data: [{ id: "a" }], error: null };
});

describe("loadAgentDocuments", () => {
  it("returns UNAUTHENTICATED without a user", async () => {
    mockUser = null;
    expect(await loadAgentDocuments()).toEqual({ ok: false, error: "UNAUTHENTICATED" });
  });

  it("returns the documents", async () => {
    const res = await loadAgentDocuments();
    expect(res).toEqual({ ok: true, documents: [{ id: "a" }] });
  });

  it("returns FAILED when the read throws", async () => {
    listResult = { data: null, error: { message: "boom" } };
    const res = await loadAgentDocuments();
    expect(res).toEqual({ ok: false, error: "FAILED", message: "boom" });
  });
});
