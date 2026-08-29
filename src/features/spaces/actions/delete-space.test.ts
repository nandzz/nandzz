import { describe, it, expect, vi, beforeEach } from "vitest";

const SPACE_ID = "11111111-1111-4111-8111-111111111111";

let mockUser: { id: string } | null;
let selectResult: { data: Record<string, unknown> | null };
let deleteResult: { error: { message: string } | null };
let removedBuckets: string[];

function spacesBuilder() {
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.delete = () => b;
  b.eq = () => b;
  b.single = async () => selectResult;
  // The row delete is `await from("spaces").delete().eq(...)`, so the chain
  // itself must resolve to `{ error }`.
  b.then = (resolve: (v: unknown) => unknown) => resolve(deleteResult);
  return b;
}

// `deleteSpace` revalidates the layout after a successful delete; there's no
// Next request context under vitest, so stub it to a no-op.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mockUser } }) },
    from: () => spacesBuilder(),
    storage: {
      from: (bucket: string) => ({
        remove: async () => {
          removedBuckets.push(bucket);
          return { error: null };
        },
      }),
    },
  }),
}));

import { deleteSpace } from "./delete-space";

beforeEach(() => {
  mockUser = { id: "user_1" };
  selectResult = { data: null };
  deleteResult = { error: null };
  removedBuckets = [];
});

describe("deleteSpace", () => {
  it("rejects a non-uuid id", async () => {
    const res = await deleteSpace({ id: "not-a-uuid" });
    expect(res).toEqual({ ok: false, error: "INVALID_INPUT" });
  });

  it("returns UNAUTHENTICATED without a user", async () => {
    mockUser = null;
    const res = await deleteSpace({ id: SPACE_ID });
    expect(res).toEqual({ ok: false, error: "UNAUTHENTICATED" });
  });

  it("cleans up each populated asset bucket before deleting the row", async () => {
    selectResult = {
      data: {
        preview_image_url: "https://x/object/public/space-previews/u/p.png",
        html_url: "https://x/object/public/space-html/u/h.html",
        pdf_url: null,
        image_url: null,
      },
    };
    const res = await deleteSpace({ id: SPACE_ID });
    expect(res).toEqual({ ok: true });
    expect(removedBuckets.sort()).toEqual(["space-html", "space-previews"]);
  });

  it("deletes the row even when there are no assets to clean up", async () => {
    const res = await deleteSpace({ id: SPACE_ID });
    expect(res).toEqual({ ok: true });
    expect(removedBuckets).toEqual([]);
  });

  it("surfaces a DB delete error as FAILED", async () => {
    deleteResult = { error: { message: "boom" } };
    const res = await deleteSpace({ id: SPACE_ID });
    expect(res).toEqual({ ok: false, error: "FAILED", message: "boom" });
  });
});
