import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

const nextConfig: NextConfig = {
  // Emit .next/standalone (server.js + traced node_modules) for a slim Docker
  // runtime image. Ignored by Vercel, which uses its own build output.
  output: "standalone",
  // The OG image routes read subsetted brand fonts from assets/og/ at request
  // time via readFile. Output file tracing can't infer dynamic reads, so list
  // the assets explicitly to guarantee they ship with the serverless bundles.
  outputFileTracingIncludes: {
    "/api/og/rank": ["./assets/og/*.ttf"],
    "/api/og/pick": ["./assets/og/*.ttf"],
  },
  // Baseline security headers on every response. Vercel already sends HSTS for
  // the apex domain, so this adds the ones it does not: clickjacking, MIME
  // sniffing, referrer leakage, and unused browser capabilities.
  //
  // No Content-Security-Policy here on purpose — Next injects inline bootstrap
  // scripts, so a CSP needs per-request nonces via proxy/middleware rather than
  // a static header, and a wrong one takes the whole site down.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // The app is never meant to be framed. The one <iframe> it renders
          // (admin email preview) is same-origin and sandboxed, so DENY is safe.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Send the full URL same-origin, bare origin cross-origin: share
          // targets and OG scrapers still see the domain, never the path (which
          // can carry pool and match IDs).
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // No code path uses these; deny them so an injected script can't.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },
  // Legacy single-competition paths (pre-`[league]` routing) 308-redirect to the
  // league catalog. The locale is constrained to the supported set, and every
  // source is exactly two path segments — the new `/[locale]/[league]/…` routes
  // carry an extra segment, so they never collide with these.
  async redirects() {
    const legacy = [
      "matches",
      "matches/:matchId",
      "leaderboard",
      "standings",
      "bracket",
      "my-picks",
    ];
    return legacy.map((path) => ({
      source: `/:locale(en|es|fr|de)/${path}`,
      destination: "/:locale/catalog",
      permanent: true,
    }));
  },
};

export default withNextIntl(nextConfig);
