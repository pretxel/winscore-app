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
  // Legacy single-competition paths (pre-`[league]` routing) 308-redirect to the
  // league catalog. The locale is constrained to the supported set, and every
  // source is exactly two path segments — the new `/[locale]/[league]/…` routes
  // carry an extra segment, so they never collide with these.
  async redirects() {
    const legacy = ["matches", "matches/:matchId", "leaderboard", "standings", "bracket", "my-picks"];
    return legacy.map((path) => ({
      source: `/:locale(en|es|fr|de)/${path}`,
      destination: "/:locale/catalog",
      permanent: true,
    }));
  },
};

export default withNextIntl(nextConfig);
