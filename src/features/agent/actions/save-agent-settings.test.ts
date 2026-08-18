import { describe, it, expect, vi, beforeEach } from "vitest";

let mockUser: { id: string } | null;
let updateResult: { data: unknown; error: { message: string } | null };
let capturedUpdate: Record<string, unknown> | null;

const revalidateTag = vi.fn();
const revalidatePath = vi.fn();

function serverBuilder() {
  const b: Record<string, unknown> = {};
  b.update = (patch: Record<string, unknown>) => {
    capturedUpdate = patch;
    const u: Record<string, unknown> = {};
    u.eq = () => u;
    u.select = () => u;
    u.single = async () => updateResult;
    return u;
  };
  return b;
}

vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mockUser } }) },
    from: () => serverBuilder(),
  }),
}));

import { saveAgentSettings } from "./save-agent-settings";

beforeEach(() => {
  mockUser = { id: "user_1" };
  updateResult = {
    data: { agent_enabled: true, agent_suggested_questions: ["Q1"], username: "alice" },
    error: null,
  };
  capturedUpdate = null;
  revalidateTag.mockClear();
  revalidatePath.mockClear();
});

describe("saveAgentSettings", () => {
  it("returns INVALID_INPUT when enabled is missing", async () => {
    const res = await saveAgentSettings({ agent_suggested_questions: [] } as never);
    expect(res).toEqual({ ok: false, error: "INVALID_INPUT" });
  });

  it("returns UNAUTHENTICATED without a user", async () => {
    mockUser = null;
    const res = await saveAgentSettings({ agent_enabled: true, agent_suggested_questions: [] });
    expect(res).toEqual({ ok: false, error: "UNAUTHENTICATED" });
  });

  it("sanitizes questions (trim, drop empties, cap at 6)", async () => {
    await saveAgentSettings({
      agent_enabled: true,
      agent_suggested_questions: ["  a  ", "", "b", "c", "d", "e", "f", "g"],
    });
    expect(capturedUpdate).toEqual({
      agent_enabled: true,
      agent_suggested_questions: ["a", "b", "c", "d", "e", "f"],
    });
  });

  it("busts the owner's profile cache and returns the persisted values", async () => {
    const res = await saveAgentSettings({
      agent_enabled: true,
      agent_suggested_questions: ["Q1"],
    });
    expect(res).toEqual({ ok: true, enabled: true, questions: ["Q1"] });
    expect(revalidateTag).toHaveBeenCalledWith("profile:alice", "max");
    expect(revalidatePath).toHaveBeenCalledWith("/alice");
  });

  it("returns FAILED when the update errors", async () => {
    updateResult = { data: null, error: { message: "boom" } };
    const res = await saveAgentSettings({ agent_enabled: false, agent_suggested_questions: [] });
    expect(res).toEqual({ ok: false, error: "FAILED", message: "boom" });
  });
});
