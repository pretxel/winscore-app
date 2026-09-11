# Baseline — before Cache Components

Production, signed out, warm (one priming request discarded, then the median of three).
Captured 2026-09-10T17:33Z against https://winscore-app.vercel.app.

| Page | TTFB | Total | Size |
|---|---|---|---|
| `/en/catalog` | 0.693s | 0.876s | 181 KB |
| `/en/la-liga-2026-2027/standings` | 0.369s | 0.538s | 212 KB |
| `/en/world-cup-2026/bracket` | 0.359s | 0.659s | 255 KB |
| `/en/news` | 0.350s | 0.536s | 169 KB |
| `/en/how-it-works` | 0.351s | 0.508s | 129 KB |
| `/en/la-liga-2026-2027/leaderboard` | 0.364s | 0.768s | 161 KB |
| `/en/la-liga-2026-2027/matches` | 0.543s | 0.715s | 484 KB |
| `/en/world-cup-2026/matches/c3dbfa35-f0ee-4106-a80b-2836227d5625` | 0.370s | 1.228s | 182 KB |
| `/en` | 0.989s | 1.008s | 162 KB |

## After phases 1-5

Same method, same host, captured 2026-09-11T00:10Z, against the deploy of
`ce32b20`. Totals over the open internet are noisy; the TTFB column is the one
the change is aimed at.

| Page | TTFB before | TTFB after | Total before | Total after |
|---|---|---|---|---|
| `/en/catalog` | 0.693s | 0.166s | 0.876s | 0.453s |
| `/en/la-liga-2026-2027/standings` | 0.369s | 0.211s | 0.538s | 0.589s |
| `/en/world-cup-2026/bracket` | 0.359s | 0.233s | 0.659s | 0.700s |
| `/en/news` | 0.350s | 0.150s | 0.536s | 0.312s |
| `/en/how-it-works` | 0.351s | 0.217s | 0.508s | 0.417s |
| `/en/la-liga-2026-2027/leaderboard` | 0.364s | 0.128s | 0.768s | 0.483s |
| `/en/la-liga-2026-2027/matches` | 0.543s | 0.154s | 0.715s | 0.690s |
| `/en/world-cup-2026/matches/c3dbfa35…` | 0.370s | 0.139s | 1.228s | 0.581s |
| `/en` | 0.989s | 0.130s | 1.008s | 1.113s |

Notes:

- Every page's server time to first byte fell, the catalog and the fixture list
  by roughly four times, the match page by nearly three.
- Payload sizes are unchanged, as expected: the same markup is rendered, it is
  just rendered from cached rows rather than fresh queries.
- The home page is the outlier on total time. Its TTFB dropped the most of any
  page, but its total did not improve, because task 2.2 is still deferred: the
  page mixes the viewer's own pools with the public lanes, so only the lanes are
  cached and the rest of the page still waits on per-request reads.
- Standings and bracket totals moved within the noise of three samples over the
  public internet. Their TTFB is the reliable figure.
