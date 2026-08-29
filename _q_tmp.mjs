import { createClient } from "@supabase/supabase-js";
const db = createClient(process.env.SB_URL, process.env.SB_KEY);

const plans = await db.from("subscription_plans").select("slug,active,stripe_price_id,price_cents");
console.log("PROD subscription_plans:", JSON.stringify(plans.data, null, 2), plans.error ?? "");

const r = await db.rpc("set_user_plan", {
  p_user_id: "00000000-0000-0000-0000-000000000000",
  p_plan_slug: "starter", p_status: "active", p_sub_id: "probe", p_period_end: null,
});
console.log("set_user_plan present?:", JSON.stringify(r.error ?? "ok"));
