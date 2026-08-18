// Server-only barrel for the booking / widgets feature. The `data/` read layer
// pulls `import "server-only"`, so it lives here — not in `index.ts` — keeping
// the client-safe barrel importable from Client Components.
export {
  getProfileWidgets,
  getPublicWidgetById,
  getOwnerWidgets,
  getOwnerWidgetById,
  ownerHasWidgetAccess,
  getWidgetCatalog,
} from "./data/widgets";
