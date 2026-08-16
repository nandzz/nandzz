import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserEntitlements } from "@/lib/plan";
import { defaultCalendarConfig } from "@/lib/widgets/calendar";

// Owner's widget instances (joined to their catalog type). Owner-scoped by RLS.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("widget_instances")
    .select("*, catalog:widget_catalog(*)")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Adds a widget instance to the owner's profile. Widgets are unlocked by the
// plan (Starter/Pro) — no per-widget checkout. Created hidden (enabled: false);
// the owner flips it on from the widget's settings.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { catalog_id } = (await request.json()) as { catalog_id?: string };
  if (!catalog_id) {
    return NextResponse.json({ error: "catalog_id is required" }, { status: 400 });
  }

  const entitlements = await getUserEntitlements(user.id);
  if (!entitlements.hasWidgets) {
    return NextResponse.json({ error: "PLAN_REQUIRED", upgrade_url: "/dashboard/credits" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: widget, error: widgetErr } = await admin
    .from("widget_catalog")
    .select("id, slug, active")
    .eq("id", catalog_id)
    .single();
  if (widgetErr || !widget || !widget.active) {
    return NextResponse.json({ error: "Widget not available" }, { status: 404 });
  }

  // One instance per (owner, widget type) — return the existing one if present.
  const { data: existing } = await admin
    .from("widget_instances")
    .select("id")
    .eq("user_id", user.id)
    .eq("catalog_id", catalog_id)
    .maybeSingle();
  if (existing?.id) {
    return NextResponse.json({ id: existing.id });
  }

  const seedConfig =
    widget.slug === "calendar"
      ? defaultCalendarConfig()
      : widget.slug === "agent"
        ? { enabled: true }
        : {};

  const { data: created, error: createErr } = await admin
    .from("widget_instances")
    .insert({ user_id: user.id, catalog_id, config: seedConfig, enabled: false })
    .select("id")
    .single();
  if (createErr || !created) {
    return NextResponse.json({ error: "Could not create widget instance" }, { status: 500 });
  }

  return NextResponse.json({ id: created.id });
}
