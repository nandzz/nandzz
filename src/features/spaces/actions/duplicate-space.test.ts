import { describe, it, expect, vi, beforeEach } from "vitest";

const SPACE_ID = "22222222-2222-4222-8222-222222222222";

let mockUser: { id: string } | null;
let source: Record<string, unknown> | null;
let rpcResult: { data: unknown; error: { message: string } | null };
let rpcArgs: Record<string, unknown> | null;

function adminSpacesBuilder() {
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.eq = () => b;
  b.single = async () => ({ data: source });
  return b;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mockUser } }) },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => adminSpacesBuilder(),
    rpc: async (_fn: string, args: Record<string, unknown>) => {
      rpcArgs = args;
      return rpcResult;
    },
    storage: { from: () => ({}) },
  }),
}));

import { duplicateSpace } from "./duplicate-space";

beforeEach(() => {
  mockUser = { id: "user_1" };
  // No asset URLs → copyAsset is never exercised (kept simple; asset copy is
  // covered by the storage helpers).
  source = {
    id: SPACE_ID,
    user_id: "user_1",
    title: "Original",
    description: null,
    url: null,
    html_url: null,
    pdf_url: null,
    image_url: null,
    video_url: null,
    markdown_content: null,
    preview_image_url: null,
    preview_gradient: null,
    preview_title: null,
    is_public: true,
    hashtags: ["a"],
  };
  rpcResult = { data: [{ space_id: "new-space" }], error: null };
  rpcArgs = null;
});

describe("duplicateSpace", () => {
  it("rejects a non-uuid id", async () => {
    const res = await duplicateSpace({ id: "nope" });
    expect(res).toEqual({ ok: false, error: "INVALID_INPUT" });
  });

  it("returns UNAUTHENTICATED without a user", async () => {
    mockUser = null;
    const res = await duplicateSpace({ id: SPACE_ID });
    expect(res).toEqual({ ok: false, error: "UNAUTHENTICATED" });
  });

  it("returns NOT_FOUND when the source is missing", async () => {
    source = null;
    const res = await duplicateSpace({ id: SPACE_ID });
    expect(res).toEqual({ ok: false, error: "NOT_FOUND" });
  });

  it("forbids duplicating someone else's private space", async () => {
    source = { ...(source as object), is_public: false, user_id: "other" };
    const res = await duplicateSpace({ id: SPACE_ID });
    expect(res).toEqual({ ok: false, error: "FORBIDDEN" });
  });

  it("duplicates as a private copy titled '(copy)'", async () => {
    const res = await duplicateSpace({ id: SPACE_ID });
    expect(res).toEqual({ ok: true, spaceId: "new-space" });
    expect(rpcArgs?.p_user_id).toBe("user_1");
    const payload = rpcArgs?.p_space_payload as Record<string, unknown>;
    expect(payload.title).toBe("Original (copy)");
    expect(payload.is_public).toBe(false);
  });

  it("maps a SPACE_LIMIT_REACHED rpc error to its code", async () => {
    rpcResult = { data: null, error: { message: "SPACE_LIMIT_REACHED: cap" } };
    const res = await duplicateSpace({ id: SPACE_ID });
    expect(res).toEqual({ ok: false, error: "SPACE_LIMIT_REACHED" });
  });
});
