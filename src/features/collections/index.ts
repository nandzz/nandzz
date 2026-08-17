// Client-safe public API for the collections feature. Server-only read helpers
// live in "./server".
export { AddToCollectionDialog } from "./components/AddToCollectionDialog";
export { StarButton } from "./components/StarButton";
export { NewCollectionForm } from "./components/NewCollectionForm";
export { CollectionActions } from "./components/CollectionActions";
export { removeSpaceFromCollection } from "./actions/remove-space-from-collection";
export type { RemoveSpaceFromCollectionResult } from "./actions/remove-space-from-collection";
