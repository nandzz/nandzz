// Pure helper (no I/O) — extracts @usernames from comment content. Shared by the
// post-comment action; kept separate so it's trivially unit-testable.
export function parseMentions(content: string): string[] {
  return [...content.matchAll(/@(\w+)/g)].map((m) => m[1]);
}
