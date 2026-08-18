import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAgentDocuments, getPublicAgentDocCount } from "./documents";

function listClient(result: { data: unknown; error: { message: string } | null }) {
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.eq = () => b;
  // second .order() resolves the query
  let orderCalls = 0;
  b.order = () => {
    orderCalls += 1;
    return orderCalls >= 2 ? Promise.resolve(result) : b;
  };
  return { from: () => b } as unknown as SupabaseClient;
}

function countClient(count: number | null) {
  const b: Record<string, unknown> = {};
  b.select = () => b;
  let eqCalls = 0;
  b.eq = () => {
    eqCalls += 1;
    // user_id, visibility, status — resolve after the third .eq()
    return eqCalls >= 3 ? Promise.resolve({ count }) : b;
  };
  return { from: () => b } as unknown as SupabaseClient;
}

describe("getAgentDocuments", () => {
  it("returns the rows", async () => {
    const rows = [{ id: "a" }, { id: "b" }];
    const docs = await getAgentDocuments(
      listClient({ data: rows, error: null }),
      "user_1"
    );
    expect(docs).toEqual(rows);
  });

  it("returns [] when data is null", async () => {
    const docs = await getAgentDocuments(
      listClient({ data: null, error: null }),
      "user_1"
    );
    expect(docs).toEqual([]);
  });

  it("throws when the query errors", async () => {
    await expect(
      getAgentDocuments(listClient({ data: null, error: { message: "boom" } }), "user_1")
    ).rejects.toThrow("boom");
  });
});

describe("getPublicAgentDocCount", () => {
  it("returns the count", async () => {
    expect(await getPublicAgentDocCount(countClient(3), "user_1")).toBe(3);
  });

  it("returns 0 when count is null", async () => {
    expect(await getPublicAgentDocCount(countClient(null), "user_1")).toBe(0);
  });
});
