import { z } from "zod";

// Shared field limits (mirrors the client-side limits in the create form).
const name = z.string().trim().min(1).max(80);
const description = z.string().trim().max(300).nullish();

export const createCollectionSchema = z.object({
  name,
  description,
  // Collections default to PRIVATE. The DB column default is still `true`, so
  // every insert must pass this explicitly — see the collections-private memory.
  isPublic: z.boolean().default(false),
});

export const updateCollectionSchema = z.object({
  id: z.uuid(),
  name,
  description,
  isPublic: z.boolean(),
});

export const deleteCollectionSchema = z.object({ id: z.uuid() });

export const setSpaceCollectionsSchema = z.object({
  spaceId: z.uuid(),
  add: z.array(z.uuid()),
  remove: z.array(z.uuid()),
});

export const spaceIdSchema = z.object({ spaceId: z.uuid() });

export type CreateCollectionInput = z.input<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
