import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpaceGrid } from "./SpaceGrid";
import type { Space, Tag } from "@/lib/types";

// Mock SpaceCard so SpaceGrid tests stay focused on filtering/layout logic
vi.mock("./SpaceCard", () => ({
  SpaceCard: ({ space }: { space: Space }) => (
    <div data-testid="space-card" data-space-id={space.id}>
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

const makeSpace = (id: string, title: string): Space => ({
  id,
  title,
  description: null,
  user_id: "user-1",
  url: null,
  html_url: null,
  preview_image_url: null,
  is_public: true,
  likes_count: 0,
  created_at: new Date().toISOString(),
});

const tagTool: Tag = { id: "t1", name: "Tool", slug: "tool", created_at: "" };
const tagService: Tag = { id: "t2", name: "Service", slug: "service", created_at: "" };

const space1 = makeSpace("1", "Space 1");
const space2 = makeSpace("2", "Space 2");
const space3 = makeSpace("3", "Space 3");

const allSpaces = [space1, space2, space3];

// space1 → Tool, space2 → Service, space3 → Tool+Service
const spaceTagsMap = {
  "1": [tagTool],
  "2": [tagService],
  "3": [tagTool, tagService],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SpaceGrid", () => {
  describe("rendering", () => {
    it("renders all spaces with no filter", () => {
      render(<SpaceGrid spaces={allSpaces} spaceTagsMap={spaceTagsMap} />);
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

    it("shows the empty state when filtered list is empty", () => {
      render(<SpaceGrid spaces={[]} />);
      expect(screen.getByText(/no spaces match this filter/i)).toBeInTheDocument();
    });
  });

  describe("tag filter", () => {
    it("lists all unique tags in the dropdown", () => {
      render(<SpaceGrid spaces={allSpaces} spaceTagsMap={spaceTagsMap} />);
      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /tool/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /service/i })).toBeInTheDocument();
    });

    it("filters to Tool-tagged spaces when Tool is selected", async () => {
      const user = userEvent.setup();
      render(<SpaceGrid spaces={allSpaces} spaceTagsMap={spaceTagsMap} />);

      await user.selectOptions(screen.getByRole("combobox"), "tag:tool");

      const cards = screen.getAllByTestId("space-card");
      // space1 and space3 have Tool tag
      expect(cards).toHaveLength(2);
      expect(screen.getByText("Space 1")).toBeInTheDocument();
      expect(screen.getByText("Space 3")).toBeInTheDocument();
    });

    it("filters to Service-tagged spaces when Service is selected", async () => {
      const user = userEvent.setup();
      render(<SpaceGrid spaces={allSpaces} spaceTagsMap={spaceTagsMap} />);

      await user.selectOptions(screen.getByRole("combobox"), "tag:service");

      const cards = screen.getAllByTestId("space-card");
      // space2 and space3 have Service tag
      expect(cards).toHaveLength(2);
      expect(screen.getByText("Space 2")).toBeInTheDocument();
      expect(screen.getByText("Space 3")).toBeInTheDocument();
    });

    it("resets to all spaces when All is selected", async () => {
      const user = userEvent.setup();
      render(<SpaceGrid spaces={allSpaces} spaceTagsMap={spaceTagsMap} />);

      await user.selectOptions(screen.getByRole("combobox"), "tag:tool");
      expect(screen.getAllByTestId("space-card")).toHaveLength(2);

      await user.selectOptions(screen.getByRole("combobox"), "all");
      expect(screen.getAllByTestId("space-card")).toHaveLength(3);
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
