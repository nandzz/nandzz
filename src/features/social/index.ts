// Client-safe public API for the social feature (likes + follows).
// Server-only read helpers live in "./server" so this barrel can be imported
// from Client Components without pulling in `server-only` modules.
export { LikeButton } from "./components/LikeButton";
export { FollowButton } from "./components/FollowButton";
export type { ToggleLikeResult } from "./actions/toggle-like";
export type { ToggleFollowResult } from "./actions/toggle-follow";
