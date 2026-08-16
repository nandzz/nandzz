import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getUserCollections,
  getUserCollectionsWithCounts,
  getOwnedCollection,
  getCollectionSpaces,
  getSpaceCollectionIds,
  getSpaceSaved,
  getSavedSpaceIds,
} from "./collections";

// Chainable Supabase stub: filter methods return the builder; the builder
// resolves (awaited, or via single/maybeSingle) to `result`.
function stub(result: unknown, opts: { record?: (m: string, a: unknown[]) => void } = {}) {
  const builder: Record<string, unknown> = {};
  const pass =
    (method: string) =>
    (...args: unknown[]) => {
      opts.record?.(method, args);
      return builder;
    };
  for (const m of ["select", "eq", "in", "order", "limit"]) builder[m] = pass(m);
  builder.single = () => Promise.resolve(result);
  builder.maybeSingle = () => Promise.resolve(result);
  builder.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(res, rej);
  return { supabase: { from: () => builder } as unknown as SupabaseClient, builder };
}

describe("getUserCollections", () => {
  it("returns the rows or [] ", async () => {
    const { supabase } = stub({ data: [{ id: "c1", name: "A" }] });
    expect(await getUserCollections(supabase, "u1")).toEqual([{ id: "c1", name: "A" }]);
    const empty = stub({ data: null });
    expect(await getUserCollections(empty.supabase, "u1")).toEqual([]);
  });
});

describe("getUserCollectionsWithCounts", () => {
  it("passes rows through", async () => {
    const rows = [{ id: "c1", name: "A", collection_spaces: [{ id: "x" }] }];
    const { supabase } = stub({ data: rows });
    expect(await getUserCollectionsWithCounts(supabase, "u1")).toEqual(rows);
  });
});

describe("getOwnedCollection", () => {
  it("returns the row or null", async () => {
    const { supabase } = stub({ data: { id: "c1", name: "A" } });
    expect(await getOwnedCollection(supabase, "c1", "u1")).toEqual({ id: "c1", name: "A" });
    const none = stub({ data: null });
    expect(await getOwnedCollection(none.supabase, "c1", "u1")).toBeNull();
  });
});

describe("getCollectionSpaces", () => {
  it("unwraps and filters the joined spaces", async () => {
    const { supabase } = stub({
      data: [{ space_id: "s1", spaces: { id: "s1" } }, { space_id: "s2", spaces: null }],
    });
    expect(await getCollectionSpaces(supabase, "c1")).toEqual([{ id: "s1" }]);
  });
});

describe("getSpaceCollectionIds", () => {
  it("maps membership rows", async () => {
    const { supabase } = stub({ data: [{ collection_id: "c1" }, { collection_id: "c2" }] });
    expect(await getSpaceCollectionIds(supabase, "s1")).toEqual(["c1", "c2"]);
  });
});

describe("getSpaceSaved", () => {
  it("true when at least one membership row", async () => {
    const { supabase } = stub({ data: [{ collection_id: "c1" }] });
    expect(await getSpaceSaved(supabase, "u1", "s1")).toBe(true);
    const none = stub({ data: [] });
    expect(await getSpaceSaved(none.supabase, "u1", "s1")).toBe(false);
  });
});

describe("getSavedSpaceIds", () => {
  it("short-circuits on empty input", async () => {
    const calls: string[] = [];
    const { supabase } = stub({ data: [] }, { record: (m) => calls.push(m) });
    expect(await getSavedSpaceIds(supabase, "u1", [])).toEqual([]);
    expect(calls).toEqual([]);
  });
  it("dedupes saved space ids", async () => {
    const { supabase } = stub({ data: [{ space_id: "s1" }, { space_id: "s1" }, { space_id: "s2" }] });
    expect(await getSavedSpaceIds(supabase, "u1", ["s1", "s2"])).toEqual(["s1", "s2"]);
  });
});
