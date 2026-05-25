import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpaceGrid } from "./SpaceGrid";
import type { Space } from "@/lib/types";

// Mock SpaceCard so SpaceGrid tests stay focused on filtering/layout logic
vi.mock("./SpaceCard", () => ({
  SpaceCard: ({ space }: { space: Space }) => (
    <div data-testid="space-card" data-space-id={space.id} data-space-type={space.type}>
      {space.title}
    </div>
  ),
}));

// Mock next/link to avoid router context requirement
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const makeSpace = (overrides: Partial<Space> & Pick<Space, "id" | "type">): Space => ({
  title: `Space ${overrides.id}`,
  description: null,
  user_id: "user-1",
  url: null,
  html_content: null,
  thumbnail_url: null,
  likes_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const urlSpace1 = makeSpace({ id: "1", type: "url", title: "URL Space 1" });
const urlSpace2 = makeSpace({ id: "2", type: "url", title: "URL Space 2" });
const htmlSpace1 = makeSpace({ id: "3", type: "html", title: "HTML Space 1" });

const allSpaces = [urlSpace1, urlSpace2, htmlSpace1];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SpaceGrid", () => {
  describe("rendering", () => {
    it("renders all spaces with no filter", () => {
      render(<SpaceGrid spaces={allSpaces} />);
      expect(screen.getAllByTestId("space-card")).toHaveLength(3);
    });

    it("renders nothing when spaces array is empty", () => {
      render(<SpaceGrid spaces={[]} />);
      expect(screen.queryAllByTestId("space-card")).toHaveLength(0);
    });

    it("shows create card when showCreateCard is true", () => {
      render(<SpaceGrid spaces={[]} showCreateCard />);
      expect(screen.getByText("Create New Space")).toBeInTheDocument();
    });

    it("does not show create card by default", () => {
      render(<SpaceGrid spaces={allSpaces} />);
      expect(screen.queryByText("Create New Space")).not.toBeInTheDocument();
    });
  });

  describe("type filter", () => {
    it("hides url/html filter buttons when that type has 0 spaces", () => {
      render(<SpaceGrid spaces={[urlSpace1, urlSpace2]} />);
      // Only url spaces — html filter button should not appear
      expect(screen.queryByRole("button", { name: /custom page/i })).not.toBeInTheDocument();
    });

    it("shows filter buttons for types that have spaces", () => {
      render(<SpaceGrid spaces={allSpaces} />);
      expect(screen.getByRole("button", { name: /website/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /custom page/i })).toBeInTheDocument();
    });

    it("filters to url spaces when Website button is clicked", async () => {
      const user = userEvent.setup();
      render(<SpaceGrid spaces={allSpaces} />);

      await user.click(screen.getByRole("button", { name: /website/i }));

      const cards = screen.getAllByTestId("space-card");
      expect(cards).toHaveLength(2);
      cards.forEach((card) => expect(card).toHaveAttribute("data-space-type", "url"));
    });

    it("filters to html spaces when Custom Page button is clicked", async () => {
      const user = userEvent.setup();
      render(<SpaceGrid spaces={allSpaces} />);

      await user.click(screen.getByRole("button", { name: /custom page/i }));

      const cards = screen.getAllByTestId("space-card");
      expect(cards).toHaveLength(1);
      expect(cards[0]).toHaveAttribute("data-space-type", "html");
    });

    it("shows the empty state message when there are no spaces at all", () => {
      render(<SpaceGrid spaces={[]} />);
      // The "no spaces here yet" message is shown when filtered list is empty
      // (filter defaults to "all", message uses "custom page" for non-url types)
      // With an empty array and default "all" filter the condition triggers
      expect(screen.getByText(/no custom page spaces here yet/i)).toBeInTheDocument();
    });

    it("resets to showing all spaces when All is clicked after filtering", async () => {
      const user = userEvent.setup();
      render(<SpaceGrid spaces={allSpaces} />);

      await user.click(screen.getByRole("button", { name: /website/i }));
      expect(screen.getAllByTestId("space-card")).toHaveLength(2);

      await user.click(screen.getByRole("button", { name: /all/i }));
      expect(screen.getAllByTestId("space-card")).toHaveLength(3);
    });

    it("hides create card when a type filter is active", async () => {
      const user = userEvent.setup();
      render(<SpaceGrid spaces={allSpaces} showCreateCard />);

      expect(screen.getByText("Create New Space")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /website/i }));
      expect(screen.queryByText("Create New Space")).not.toBeInTheDocument();
    });
  });

  describe("compact toggle", () => {
    it("starts in comfortable view (Compact button visible)", () => {
      render(<SpaceGrid spaces={allSpaces} />);
      expect(screen.getByTitle("Compact view")).toBeInTheDocument();
    });

    it("switches to compact view on toggle click", async () => {
      const user = userEvent.setup();
      render(<SpaceGrid spaces={allSpaces} />);

      await user.click(screen.getByTitle("Compact view"));
      expect(screen.getByTitle("Comfortable view")).toBeInTheDocument();
    });

    it("toggles back to comfortable view", async () => {
      const user = userEvent.setup();
      render(<SpaceGrid spaces={allSpaces} />);

      await user.click(screen.getByTitle("Compact view"));
      await user.click(screen.getByTitle("Comfortable view"));
      expect(screen.getByTitle("Compact view")).toBeInTheDocument();
    });
  });
});
