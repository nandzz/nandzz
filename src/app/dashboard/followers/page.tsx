export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getServerTranslations } from "@/lib/i18n/server";
import { PageShell } from "@/components/layout/PageShell";
import { FollowList } from "@/features/profile";

export default async function FollowersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = await getServerTranslations();

  return (
    <PageShell width="content">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/40">
          <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.profile.followersTitle}</h1>
          <p className="mt-1 text-muted-foreground">{t.profile.followersPageSubtitle}</p>
        </div>
      </div>

      <FollowList profileId={user.id} type="followers" />
    </PageShell>
  );
}
