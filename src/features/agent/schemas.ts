import { z } from "zod";

// agent_documents IDs are Postgres `gen_random_uuid()` values.
const visibility = z.enum(["public", "private"]);
const status = z.enum(["active", "outdated", "needs_review"]);

// Create mirrors the old `POST /api/agent/documents` route defaults (an empty
// title fell back to "Untitled", empty content to "").
export const createAgentDocumentSchema = z.object({
  title: z.string().default("Untitled"),
  content: z.string().default(""),
  visibility: visibility.default("public"),
  status: status.default("active"),
  is_sensitive: z.boolean().default(false),
  sort_order: z.number().int().default(100),
});

export type CreateAgentDocumentInput = z.input<typeof createAgentDocumentSchema>;

// Update is a partial patch — any subset of the content fields may be present.
// The AI advisor (AgentChat) sends only `{ title, content }` so the document's
// existing visibility / status / is_sensitive / sort_order are preserved; the
// studio editor sends the full set. Omitted keys are never written.
export const updateAgentDocumentSchema = z.object({
  id: z.uuid(),
  title: z.string().optional(),
  content: z.string().optional(),
  visibility: visibility.optional(),
  status: status.optional(),
  is_sensitive: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export type UpdateAgentDocumentInput = z.input<typeof updateAgentDocumentSchema>;

export const deleteAgentDocumentSchema = z.object({ id: z.uuid() });

export const embedAgentDocumentSchema = z.object({ id: z.uuid() });

// Owner agent settings (enable flag + the visitor suggested-question chips).
export const saveAgentSettingsSchema = z.object({
  agent_enabled: z.boolean(),
  agent_suggested_questions: z.array(z.string()).default([]),
});

export type SaveAgentSettingsInput = z.input<typeof saveAgentSettingsSchema>;
