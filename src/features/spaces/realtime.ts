import { createClient } from "@/lib/supabase/client";

// Client-side realtime + read helpers for AI-edit jobs. Realtime subscriptions
// fundamentally require the browser Supabase client, so — like the storage
// helpers — they live OUTSIDE `components/` to satisfy the `no-restricted-imports`
// guardrail. Components consume these through thin callbacks and never touch
// `@/lib/supabase/*` themselves.

export type AiEditJobUpdate = {
  id: string;
  status: string;
  instruction: string;
  result_html?: string;
  error_code?: string;
};

export type PendingAiEditJob = {
  id: string;
  instruction: string;
  result_html: string;
};

/** Latest completed (status="done") AI-edit job for a space, or null. */
export async function fetchPendingAiEditJob(
  spaceId: string
): Promise<PendingAiEditJob | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("ai_edit_jobs")
    .select("id, instruction, result_html")
    .eq("space_id", spaceId)
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.result_html ? (data as PendingAiEditJob) : null;
}

/**
 * Subscribes to AI-edit job UPDATEs for a space (used by the HTML editor to
 * surface an approval banner when a job completes / an error banner when it
 * fails). Returns an unsubscribe function.
 */
export function subscribeToAiEditApprovals(
  spaceId: string,
  handlers: { onUpdate: (job: AiEditJobUpdate) => void }
): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`ai-edit-approval-${spaceId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "ai_edit_jobs",
        filter: `space_id=eq.${spaceId}`,
      },
      (payload) => handlers.onUpdate(payload.new as AiEditJobUpdate)
    )
    .subscribe();
  return () => {
    channel.unsubscribe();
  };
}

/**
 * Subscribes to a single AI-edit job by id (used by the assistant panel to
 * surface an inline error if the edge function fails). Returns an unsubscribe
 * function.
 */
export function subscribeToAiEditJob(
  jobId: string,
  handlers: { onUpdate: (job: { status: string; error_code?: string }) => void }
): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`ai-edit-job-${jobId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "ai_edit_jobs",
        filter: `id=eq.${jobId}`,
      },
      (payload) =>
        handlers.onUpdate(
          payload.new as { status: string; error_code?: string }
        )
    )
    .subscribe();
  return () => {
    channel.unsubscribe();
  };
}
