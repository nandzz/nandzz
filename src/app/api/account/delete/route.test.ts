import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "./route";

const mockGetUser = vi.fn();
const mockDeleteUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: { admin: { deleteUser: mockDeleteUser } },
  }),
}));

// next/headers is imported transitively by the server client; stub it out
vi.mock("next/headers", () => ({
  cookies: () => ({ getAll: () => [], set: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DELETE /api/account/delete", () => {
  it("returns 401 when no user is authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await DELETE();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("calls deleteUser with the authenticated user's id", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockDeleteUser.mockResolvedValue({ error: null });

    await DELETE();

    expect(mockDeleteUser).toHaveBeenCalledWith("user-123");
  });

  it("returns 200 with success:true on successful deletion", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockDeleteUser.mockResolvedValue({ error: null });

    const res = await DELETE();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("returns 500 with error message when deleteUser fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockDeleteUser.mockResolvedValue({ error: { message: "Deletion failed" } });

    const res = await DELETE();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Deletion failed");
  });
});
