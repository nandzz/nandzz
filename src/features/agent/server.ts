// Server-only barrel for the agent feature. The `data/` read layer pulls
// `import "server-only"`, so it lives here — not in `index.ts` — keeping the
// client-safe barrel importable from Client Components.
export { getAgentDocuments, getPublicAgentDocCount } from "./data/documents";
