// Client-safe public API for the spaces feature. This slice covers the space
// card/grid display cluster and space lifecycle (delete / duplicate). Editors,
// builders and the AI assistant migrate in a later slice.
export { SpaceCard } from "./components/SpaceCard";
export { SpaceGrid } from "./components/SpaceGrid";
export { SpacePreview } from "./components/SpacePreview";
export { SpaceOwnerMenu } from "./components/SpaceOwnerMenu";
export { DeleteSpaceButton } from "./components/DeleteSpaceButton";
export { DuplicateSpaceButton } from "./components/DuplicateSpaceButton";
export { ShareButton } from "./components/ShareButton";
export { ShareMenu } from "./components/ShareMenu";

export { deleteSpace } from "./actions/delete-space";
export { duplicateSpace } from "./actions/duplicate-space";
export type { DeleteSpaceResult } from "./actions/delete-space";
export type { DuplicateSpaceResult } from "./actions/duplicate-space";
