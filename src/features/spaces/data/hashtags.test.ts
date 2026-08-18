import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicHashtags } from "./hashtags";

function stubClient(result: { data: { hashtags: string[] | null }[] | null }) {
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.eq = () => b;
  b.limit = async () => result;
  return { from: () => b } as unknown as SupabaseClient;
}

describe("getPublicHashtags", () => {
  it("returns [] when there is no data", async () => {
    const tags = await getPublicHashtags(stubClient({ data: null }));
    expect(tags).toEqual([]);
  });

  it("flattens, dedupes and sorts hashtags across spaces", async () => {
    const tags = await getPublicHashtags(
      stubClient({
        data: [
          { hashtags: ["b", "a"] },
          { hashtags: ["a", "c"] },
          { hashtags: null },
        ],
      })
    );
    expect(tags).toEqual(["a", "b", "c"]);
  });
});
