import { z } from "zod";

// Widget catalog + instance IDs are Postgres `gen_random_uuid()` values.
export const createWidgetInstanceSchema = z.object({
  catalogId: z.uuid(),
});

export type CreateWidgetInstanceInput = z.infer<
  typeof createWidgetInstanceSchema
>;

// In-place update of an owner's widget instance. Any subset of the three
// editable fields may be present; `config` is validated per widget type inside
// the action (calendar today) so it stays an opaque passthrough here.
export const updateWidgetInstanceSchema = z.object({
  instanceId: z.uuid(),
  config: z.unknown().optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export type UpdateWidgetInstanceInput = z.infer<
  typeof updateWidgetInstanceSchema
>;
