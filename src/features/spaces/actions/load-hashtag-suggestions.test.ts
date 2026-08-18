import { describe, it, expect, vi } from "vitest";

// The action delegates to the server-only data read; stub it so this test
// stays focused on the action wiring.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({}),
}));
vi.mock("../data/hashtags", () => ({
  getPublicHashtags: vi.fn(async () => ["a", "b"]),
}));

import { loadHashtagSuggestions } from "./load-hashtag-suggestions";

describe("loadHashtagSuggestions", () => {
  it("returns the suggestion list from the data layer", async () => {
    const tags = await loadHashtagSuggestions();
    expect(tags).toEqual(["a", "b"]);
  });
});
