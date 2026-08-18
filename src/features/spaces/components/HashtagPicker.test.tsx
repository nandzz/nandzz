import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HashtagPicker } from "./HashtagPicker";

const suggestions = ["react", "design", "ai"];
const noop = () => {};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("HashtagPicker", () => {
  describe("rendering", () => {
    it("renders the input when no hashtags are selected", () => {
      render(<HashtagPicker suggestions={suggestions} selectedHashtags={[]} onChange={noop} />);
      expect(screen.getByPlaceholderText(/search or create a hashtag/i)).toBeInTheDocument();
    });

    it("renders selected hashtags as chips with # prefix", () => {
      render(<HashtagPicker suggestions={suggestions} selectedHashtags={["react"]} onChange={noop} />);
      expect(screen.getByText("react")).toBeInTheDocument();
    });

    it("hides the input when 3 hashtags are selected", () => {
      render(
        <HashtagPicker suggestions={suggestions} selectedHashtags={["react", "design", "ai"]} onChange={noop} />
      );
      expect(screen.queryByPlaceholderText(/search or create a hashtag/i)).not.toBeInTheDocument();
    });

    it("shows remaining count in placeholder", () => {
      render(
        <HashtagPicker suggestions={suggestions} selectedHashtags={["react"]} onChange={noop} />
      );
      expect(screen.getByPlaceholderText(/2 left/i)).toBeInTheDocument();
    });
  });

  describe("suggestions dropdown", () => {
    it("shows matching suggestions when typing", async () => {
      const user = userEvent.setup();
      render(<HashtagPicker suggestions={suggestions} selectedHashtags={[]} onChange={noop} />);

      await user.type(screen.getByPlaceholderText(/search or create/i), "re");

      expect(screen.getByText("react")).toBeInTheDocument();
    });

    it("does not show already-selected hashtags in suggestions", async () => {
      const user = userEvent.setup();
      render(
        <HashtagPicker suggestions={suggestions} selectedHashtags={["react"]} onChange={noop} />
      );

      await user.click(screen.getByPlaceholderText(/search or create/i));

      const buttons = screen.queryAllByRole("button", { name: /^react$/i });
      expect(buttons).toHaveLength(0);
    });

    it("shows 'Create' option when query has no exact match", async () => {
      const user = userEvent.setup();
      render(<HashtagPicker suggestions={suggestions} selectedHashtags={[]} onChange={noop} />);

      await user.type(screen.getByPlaceholderText(/search or create/i), "newstuff");

      expect(screen.getByText(/create/i)).toBeInTheDocument();
      expect(screen.getByText(/#newstuff/i)).toBeInTheDocument();
    });

    it("does not show 'Create' option when query exactly matches an existing suggestion", async () => {
      const user = userEvent.setup();
      render(<HashtagPicker suggestions={suggestions} selectedHashtags={[]} onChange={noop} />);

      await user.type(screen.getByPlaceholderText(/search or create/i), "react");

      expect(screen.queryByText(/create/i)).not.toBeInTheDocument();
    });

    it("does not show 'Create' for a single character (too short)", async () => {
      const user = userEvent.setup();
      render(<HashtagPicker suggestions={suggestions} selectedHashtags={[]} onChange={noop} />);

      await user.type(screen.getByPlaceholderText(/search or create/i), "x");

      expect(screen.queryByText(/create/i)).not.toBeInTheDocument();
    });
  });

  describe("adding hashtags", () => {
    it("calls onChange with the selected hashtag when clicking a suggestion", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<HashtagPicker suggestions={suggestions} selectedHashtags={[]} onChange={onChange} />);

      await user.type(screen.getByPlaceholderText(/search or create/i), "re");
      await user.click(screen.getByRole("button", { name: /react/i }));

      expect(onChange).toHaveBeenCalledWith(["react"]);
    });

    it("calls onChange with a new hashtag slug when creating", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<HashtagPicker suggestions={[]} selectedHashtags={[]} onChange={onChange} />);

      await user.type(screen.getByPlaceholderText(/search or create/i), "mynewtag");
      await user.click(screen.getByText(/create/i));

      expect(onChange).toHaveBeenCalledWith(["mynewtag"]);
    });

    it("adds hashtag on Enter when an exact match exists", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<HashtagPicker suggestions={suggestions} selectedHashtags={[]} onChange={onChange} />);

      const input = screen.getByPlaceholderText(/search or create/i);
      await user.type(input, "react");
      await user.keyboard("{Enter}");

      expect(onChange).toHaveBeenCalledWith(["react"]);
    });

    it("does not render input beyond 3 hashtags", () => {
      render(
        <HashtagPicker
          suggestions={["extra"]}
          selectedHashtags={["react", "design", "ai"]}
          onChange={vi.fn()}
        />
      );
      expect(screen.queryByPlaceholderText(/search or create a hashtag/i)).not.toBeInTheDocument();
    });

    it("strips leading # from typed input when matching", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<HashtagPicker suggestions={suggestions} selectedHashtags={[]} onChange={onChange} />);

      await user.type(screen.getByPlaceholderText(/search or create/i), "#react");
      await user.click(screen.getByRole("button", { name: /react/i }));

      expect(onChange).toHaveBeenCalledWith(["react"]);
    });
  });

  describe("removing hashtags", () => {
    it("calls onChange without the removed hashtag when X is clicked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <HashtagPicker
          suggestions={suggestions}
          selectedHashtags={["react", "design"]}
          onChange={onChange}
        />
      );

      const xButtons = screen.getAllByRole("button");
      await user.click(xButtons[0]);

      expect(onChange).toHaveBeenCalledWith(["design"]);
    });

    it("removes last hashtag on Backspace when input is empty", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <HashtagPicker
          suggestions={suggestions}
          selectedHashtags={["react", "design"]}
          onChange={onChange}
        />
      );

      const input = screen.getByPlaceholderText(/search or create/i);
      await user.click(input);
      await user.keyboard("{Backspace}");

      expect(onChange).toHaveBeenCalledWith(["react"]);
    });
  });

  describe("slug normalisation", () => {
    it("converts spaces to hyphens when creating a new hashtag", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<HashtagPicker suggestions={[]} selectedHashtags={[]} onChange={onChange} />);

      await user.type(screen.getByPlaceholderText(/search or create/i), "my tag");
      await user.click(screen.getByText(/create/i));

      expect(onChange).toHaveBeenCalledWith(["my-tag"]);
    });
  });
});
