import { describe, it, expect, vi, beforeEach } from "vitest";

// Fixtures the mocked admin client resolves against, keyed by the shape each
// query terminates on (see the thenable builder below).
let spaceRow: Record<string, unknown> | null; // getSpaceAnalytics: spaces.single()
let spacesRows: Record<string, unknown>[] | null; // getDashboardAnalytics: spaces
let viewRows: { space_id?: string; viewed_at: string }[]; // space_views (gte)
let totalCount: number | null; // space_views count(head)

function nowISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString();
}

function builder(table: string) {
  const state = { table, hasCount: false, gte: false };
  const b: Record<string, unknown> = {};
  b.select = (_cols?: unknown, opts?: { count?: string }) => {
    if (opts?.count) state.hasCount = true;
    return b;
  };
  b.eq = () => b;
  b.in = () => b;
  b.gte = () => {
    state.gte = true;
    return b;
  };
  const resolve = () => {
    if (table === "space_views") {
      if (state.hasCount) return { count: totalCount };
      return { data: viewRows };
    }
    // spaces, awaited directly (dashboard)
    return { data: spacesRows };
  };
  // single() is only used by getSpaceAnalytics' spaces lookup.
  b.single = async () => ({ data: spaceRow });
  b.then = (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
    Promise.resolve(resolve()).then(onF, onR);
  return b;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: (t: string) => builder(t) }),
}));

import { getSpaceAnalytics, getDashboardAnalytics } from "./analytics";

beforeEach(() => {
  spaceRow = { likes_count: 7, views_count: 100 };
  spacesRows = [
    { id: "s1", title: "One", views_count: 10, likes_count: 2 },
    { id: "s2", title: "Two", views_count: 5, likes_count: 3 },
  ];
  viewRows = [
    { space_id: "s1", viewed_at: nowISO(1) },
    { space_id: "s1", viewed_at: nowISO(3) },
    { space_id: "s2", viewed_at: nowISO(10) },
  ];
  totalCount = 42;
});

describe("getSpaceAnalytics", () => {
  it("prefers the exact count for totalViews and derives window stats", async () => {
    const res = await getSpaceAnalytics("s1", "en", "month");
    expect(res.spaceId).toBe("s1");
    expect(res.totalViews).toBe(42); // exact count wins over views_count
    expect(res.likesCount).toBe(7);
    // 3 view rows: two within 7d, all three within 30d.
    expect(res.views7d).toBe(2);
    expect(res.views30d).toBe(3);
    expect(res.viewsSeries.length).toBeGreaterThan(0);
  });

  it("falls back to views_count when the exact count is null", async () => {
    totalCount = null;
    spaceRow = { likes_count: 0, views_count: 100 };
    viewRows = [];
    const res = await getSpaceAnalytics("s1", "en", "month");
    // null count (nullish) → falls back to space.views_count
    expect(res.totalViews).toBe(100);
    expect(res.views7d).toBe(0);
  });
});

describe("getDashboardAnalytics", () => {
  it("aggregates totals and per-space window counts", async () => {
    const res = await getDashboardAnalytics("u1", "en", "month");
    expect(res.totalViews).toBe(15); // 10 + 5
    expect(res.totalLikes).toBe(5); // 2 + 3
    expect(res.views7d).toBe(2); // s1's two recent views
    expect(res.views30d).toBe(3);
    expect(res.spaces).toHaveLength(2);
    const s1 = res.spaces.find((s) => s.id === "s1")!;
    expect(s1.views7d).toBe(2);
    expect(s1.views30d).toBe(2);
    const s2 = res.spaces.find((s) => s.id === "s2")!;
    expect(s2.views30d).toBe(1);
  });

  it("returns a zeroed shape when the user has no spaces", async () => {
    spacesRows = [];
    const res = await getDashboardAnalytics("u1", "en", "month");
    expect(res.totalViews).toBe(0);
    expect(res.spaces).toEqual([]);
    expect(res.viewsSeries.length).toBeGreaterThan(0);
  });
});
