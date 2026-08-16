import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Collection, CollectionWithCount, Space } from "@/lib/types";

// Server-only reads for the collections feature. Consolidates the collections /
// collection_spaces table access that used to be inlined across the dashboard
// pages, the add-to-collection dialog, and the "saved" state on content pages.

// Minimal {id,name} list for the add-to-collection picker, ordered by name.
export async function getUserCollections(
  supabase: SupabaseClient,
  userId: string
): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase
    .from("collections")
    .select("id, name")
    .eq("user_id", userId)
    .order("name", { ascending: true });
  return data ?? [];
}

// Dashboard list: every collection with its member count, newest first.
export async function getUserCollectionsWithCounts(
  supabase: SupabaseClient,
  userId: string
): Promise<CollectionWithCount[]> {
  const { data } = await supabase
    .from("collections")
    .select("*, collection_spaces(id)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as CollectionWithCount[];
}

// A single collection the user owns (scoped by user_id so RLS + query agree).
export async function getOwnedCollection(
  supabase: SupabaseClient,
  id: string,
  userId: string
): Promise<Collection | null> {
  const { data } = await supabase
    .from("collections")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  return (data as Collection) ?? null;
}

// The spaces inside a collection, newest first.
export async function getCollectionSpaces(
  supabase: SupabaseClient,
  collectionId: string
): Promise<Space[]> {
  const { data } = await supabase
    .from("collection_spaces")
    .select("space_id, spaces(*)")
    .eq("collection_id", collectionId)
    .order("created_at", { ascending: false });
  return (data ?? [])
    .map((cs) => cs.spaces as unknown as Space)
    .filter(Boolean);
}

// Which of the user's collections a given space belongs to (for the picker).
export async function getSpaceCollectionIds(
  supabase: SupabaseClient,
  spaceId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("collection_spaces")
    .select("collection_id")
    .eq("space_id", spaceId);
  return data?.map((m) => m.collection_id as string) ?? [];
}

// Whether `userId` has saved a single space into any of their collections.
export async function getSpaceSaved(
  supabase: SupabaseClient,
  userId: string,
  spaceId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("collection_spaces")
    .select("collection_id, collections!inner(user_id)")
    .eq("space_id", spaceId)
    .eq("collections.user_id", userId)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

// Subset of `spaceIds` that `userId` has saved into any collection (batched).
export async function getSavedSpaceIds(
  supabase: SupabaseClient,
  userId: string,
  spaceIds: string[]
): Promise<string[]> {
  if (spaceIds.length === 0) return [];
  const { data } = await supabase
    .from("collection_spaces")
    .select("space_id, collections!inner(user_id)")
    .eq("collections.user_id", userId)
    .in("space_id", spaceIds);
  return [...new Set((data ?? []).map((e) => e.space_id as string))];
}
