import type { NextConfig } from "next";

// Supabase project host — used in CSP directives
const supabaseHost = "*.supabase.co";

// Verify the key is present at build time (visible in Amplify build logs)
console.log("[next.config] SUPABASE_SERVICE_ROLE_KEY at build time:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "MISSING");

const nextConfig: NextConfig = {
  // Bake server-only env vars into the bundle at build time.
  // Amplify's Lambda@Edge runtime has no process.env — values must come from the build.
  env: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            // Content-Security-Policy: restrict resource origins to known safe sources.
            // 'unsafe-inline' is needed for Tailwind/shadcn runtime styles.
            // frame-src is open because user spaces embed arbitrary iframes.
            key: "Content-Security-Policy",
            value: [
              `default-src 'self'`,
              `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
              `style-src 'self' 'unsafe-inline'`,
              `img-src 'self' data: blob: https://${supabaseHost}`,
              `font-src 'self'`,
              `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}`,
              `worker-src 'self'`,
              `frame-src *`,
              `object-src 'none'`,
              `base-uri 'self'`,
              `form-action 'self'`,
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
