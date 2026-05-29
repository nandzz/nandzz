export const dynamic = "force-dynamic";

export async function GET() {
  console.log("[debug-env] NODE_ENV:", process.env.NODE_ENV);
  console.log("[debug-env] NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "MISSING");
  console.log("[debug-env] SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "MISSING");
  console.log("[debug-env] SUPABASE_SERVICE_ROLE_KEY length:", process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0);
  console.log("[debug-env] All env keys with SUPABASE:", Object.keys(process.env).filter(k => k.includes("SUPABASE")));

  return Response.json({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "MISSING",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "MISSING",
    SUPABASE_SERVICE_ROLE_KEY_length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0,
    supabase_related_keys: Object.keys(process.env).filter(k => k.includes("SUPABASE")),
  });
}
