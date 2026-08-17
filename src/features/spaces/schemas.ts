import { z } from "zod";

// Space IDs are Postgres `gen_random_uuid()` values.
export const spaceIdSchema = z.object({ id: z.uuid() });

export type SpaceIdInput = z.infer<typeof spaceIdSchema>;
