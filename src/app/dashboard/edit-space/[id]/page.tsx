export const dynamic = 'force-dynamic';

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SpaceForm } from "@/components/spaces/SpaceForm";

export default async function EditSpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: space }, { data: spaceTags }] = await Promise.all([
    supabase
      .from("spaces")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("space_tags")
      .select("tags(*)")
      .eq("space_id", id),
  ]);

  if (!space) {
    notFound();
  }

  const initialTags = (spaceTags ?? []).map((row) => row.tags as unknown as import("@/lib/types").Tag);

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[300px] w-[300px] rounded-full bg-violet-100/30 blur-3xl dark:bg-violet-950/15" />
      </div>
      <div className="mx-auto flex max-w-7xl justify-center px-4 py-12 sm:px-6 lg:px-8">
        <SpaceForm space={space} initialTags={initialTags} />
      </div>
    </div>
  );
}
