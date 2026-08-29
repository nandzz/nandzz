import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getChromeProfileLite } from "./profiles";

function client(row: unknown): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: row }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe("getChromeProfileLite", () => {
  it("returns the lite profile row, preserving account_type", async () => {
    const row = {
      username: "ada",
      display_name: "Ada",
      avatar_url: null,
      account_type: "business",
    };
    expect(await getChromeProfileLite(client(row), "u1")).toEqual(row);
  });

  it("defaults account_type to 'personal' when the row omits it", async () => {
    const row = { username: "ada", display_name: "Ada", avatar_url: null };
    expect(await getChromeProfileLite(client(row), "u1")).toEqual({
      ...row,
      account_type: "personal",
    });
  });

  it("returns null when there is no row", async () => {
    expect(await getChromeProfileLite(client(null), "u1")).toBeNull();
  });
});
