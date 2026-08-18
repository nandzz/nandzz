import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteAccount } from "./DeleteAccount";

const mockPush = vi.fn();
const mockSignOut = vi.fn();
const mockFetch = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("../auth", () => ({
  signOutUser: (...args: unknown[]) => mockSignOut(...args),
}));

function renderDanger() {
  render(<DeleteAccount username="nandz" />);
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = mockFetch;
});

describe("Delete Account — danger zone", () => {
  describe("danger zone section", () => {
    it("renders the danger zone with a Delete Account button", () => {
      renderDanger();
      const buttons = screen.getAllByRole("button", { name: /delete account/i });
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it("shows a warning that the action cannot be undone", () => {
      renderDanger();
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });
  });

  describe("confirmation dialog", () => {
    async function openDialog() {
      const user = userEvent.setup();
      renderDanger();
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
      renderDanger();
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
      renderDanger();
      const [triggerBtn] = screen.getAllByRole("button", { name: /delete account/i });
      await user.click(triggerBtn);
      await user.type(screen.getByPlaceholderText("nandz"), "nandz");
      await user.click(screen.getByRole("button", { name: /delete my account/i }));

      expect(await screen.findByRole("button", { name: /deleting/i })).toBeDisabled();
    });
  });
});
