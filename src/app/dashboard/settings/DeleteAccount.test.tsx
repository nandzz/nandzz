import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "./page";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSignOut = vi.fn();
const mockFetch = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      signOut: mockSignOut,
    },
    from: mockFrom,
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "" } }),
      }),
    },
  }),
}));

vi.mock("@/lib/flags", () => ({
  FEATURES: { monetization: false },
}));

vi.mock("@/components/auth/ChangePasswordForm", () => ({
  ChangePasswordForm: () => <div />,
}));

vi.mock("@/components/ui/AvatarCropModal", () => ({
  AvatarCropModal: () => <div />,
}));

const mockProfile = {
  id: "user-1",
  username: "nandz",
  display_name: "Felipe",
  tagline: null,
  bio: null,
  website_url: null,
  social_links: {},
  avatar_url: null,
};

function setupProfileMock() {
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  const single = vi.fn().mockResolvedValue({ data: mockProfile });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  mockFrom.mockReturnValue({ select, update });
}

async function renderAndWait() {
  render(<SettingsPage />);
  // Wait for the profile to load — "cannot be undone" is unique to the danger zone
  await screen.findByText(/cannot be undone/i);
}

beforeEach(() => {
  vi.clearAllMocks();
  setupProfileMock();
  global.fetch = mockFetch;
});

describe("Delete Account — danger zone", () => {
  describe("danger zone section", () => {
    it("renders the danger zone with a Delete Account button", async () => {
      await renderAndWait();
      // getAllByRole because the dialog trigger and heading share the same text
      const buttons = screen.getAllByRole("button", { name: /delete account/i });
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it("shows a warning that the action cannot be undone", async () => {
      await renderAndWait();
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });
  });

  describe("confirmation dialog", () => {
    async function openDialog() {
      const user = userEvent.setup();
      await renderAndWait();
      // The trigger button is the first (and only) "Delete Account" button before the dialog opens
      const [triggerBtn] = screen.getAllByRole("button", { name: /delete account/i });
      await user.click(triggerBtn);
      return user;
    }

    it("opens the confirmation dialog when Delete Account is clicked", async () => {
      await openDialog();
      expect(screen.getByPlaceholderText("nandz")).toBeInTheDocument();
    });

    it("shows the username in the confirmation prompt", async () => {
      await openDialog();
      expect(screen.getByText(/nandz/)).toBeInTheDocument();
    });

    it("keeps the confirm button disabled while the input is empty", async () => {
      await openDialog();
      const confirmBtn = screen.getByRole("button", { name: /delete my account/i });
      expect(confirmBtn).toBeDisabled();
    });

    it("keeps the confirm button disabled when the typed value does not match the username", async () => {
      const user = await openDialog();
      await user.type(screen.getByPlaceholderText("nandz"), "wrong");
      expect(screen.getByRole("button", { name: /delete my account/i })).toBeDisabled();
    });

    it("enables the confirm button only when the username is typed exactly", async () => {
      const user = await openDialog();
      await user.type(screen.getByPlaceholderText("nandz"), "nandz");
      expect(screen.getByRole("button", { name: /delete my account/i })).toBeEnabled();
    });

    it("closes the dialog when Cancel is clicked", async () => {
      const user = await openDialog();
      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(screen.queryByPlaceholderText("nandz")).not.toBeInTheDocument();
    });

    it("resets the input when the dialog is reopened", async () => {
      const user = await openDialog();
      await user.type(screen.getByPlaceholderText("nandz"), "nandz");
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      const [triggerBtn] = screen.getAllByRole("button", { name: /delete account/i });
      await user.click(triggerBtn);
      expect(screen.getByPlaceholderText("nandz")).toHaveValue("");
    });
  });

  describe("account deletion flow", () => {
    async function typeAndConfirm() {
      const user = userEvent.setup();
      await renderAndWait();
      const [triggerBtn] = screen.getAllByRole("button", { name: /delete account/i });
      await user.click(triggerBtn);
      await user.type(screen.getByPlaceholderText("nandz"), "nandz");
      await user.click(screen.getByRole("button", { name: /delete my account/i }));
      return user;
    }

    it("calls DELETE /api/account/delete with correct method", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
      mockSignOut.mockResolvedValue({});

      await typeAndConfirm();

      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith("/api/account/delete", { method: "DELETE" })
      );
    });

    it("signs out and redirects to / on success", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
      mockSignOut.mockResolvedValue({});

      await typeAndConfirm();

      await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/"));
    });

    it("shows an error message when the API returns an error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Deletion failed" }),
      });

      await typeAndConfirm();

      expect(await screen.findByText("Deletion failed")).toBeInTheDocument();
      expect(mockSignOut).not.toHaveBeenCalled();
    });

    it("shows a fallback error when the API response has no error field", async () => {
      mockFetch.mockResolvedValue({ ok: false, json: async () => ({}) });

      await typeAndConfirm();

      expect(await screen.findByText(/failed to delete account/i)).toBeInTheDocument();
    });

    it("shows a fallback error when fetch throws", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await typeAndConfirm();

      expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
    });

    it("disables the confirm button while deletion is in progress", async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // never resolves
      const user = userEvent.setup();
      await renderAndWait();
      const [triggerBtn] = screen.getAllByRole("button", { name: /delete account/i });
      await user.click(triggerBtn);
      await user.type(screen.getByPlaceholderText("nandz"), "nandz");
      await user.click(screen.getByRole("button", { name: /delete my account/i }));

      expect(await screen.findByRole("button", { name: /deleting/i })).toBeDisabled();
    });
  });
});
