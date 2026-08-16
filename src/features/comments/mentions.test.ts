import { describe, it, expect } from "vitest";
import { parseMentions } from "./mentions";

describe("parseMentions", () => {
  it("extracts @usernames", () => {
    expect(parseMentions("hey @alice and @bob_1")).toEqual(["alice", "bob_1"]);
  });
  it("returns [] when there are no mentions", () => {
    expect(parseMentions("no mentions here")).toEqual([]);
  });
  it("ignores a bare @ with no word", () => {
    expect(parseMentions("email me @ home")).toEqual([]);
  });
});
