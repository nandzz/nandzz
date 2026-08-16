import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getTopLevelComments,
  getCommentsAfter,
  getReplies,
  getLikedCommentIds,
} from "./comments";

function stub(result: unknown, opts: { record?: (m: string, a: unknown[]) => void } = {}) {
  const builder: Record<string, unknown> = {};
  const pass =
    (method: string) =>
    (...args: unknown[]) => {
      opts.record?.(method, args);
      return builder;
    };
  for (const m of ["select", "eq", "is", "gt", "order", "limit", "in"]) builder[m] = pass(m);
  builder.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(res, rej);
  return { supabase: { from: () => builder } as unknown as SupabaseClient };
}

describe("getTopLevelComments / getCommentsAfter / getReplies", () => {
  it("return rows or []", async () => {
    const rows = [{ id: "c1" }];
    expect(await getTopLevelComments(stub({ data: rows }).supabase, "s1", 20)).toEqual(rows);
    expect(await getCommentsAfter(stub({ data: null }).supabase, "s1", "t", 20)).toEqual([]);
    expect(await getReplies(stub({ data: rows }).supabase, "p1")).toEqual(rows);
  });
});

describe("getLikedCommentIds", () => {
  it("short-circuits on empty input", async () => {
    const calls: string[] = [];
    const { supabase } = stub({ data: [] }, { record: (m) => calls.push(m) });
    expect(await getLikedCommentIds(supabase, "u1", [])).toEqual([]);
    expect(calls).toEqual([]);
  });
  it("maps rows to comment ids", async () => {
    const { supabase } = stub({ data: [{ comment_id: "c1" }, { comment_id: "c2" }] });
    expect(await getLikedCommentIds(supabase, "u1", ["c1", "c2"])).toEqual(["c1", "c2"]);
  });
});
