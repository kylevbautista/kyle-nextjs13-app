/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    /**
     * AniList allows ~30 requests/minute. Prerendering the 28 season pages
     * on one worker keeps `next build` from bursting past that limit.
     */
    workerThreads: false,
    cpus: 1,
    // Season/top-anime pages throw on upstream failure (so ISR keeps the last
    // good page); retry a failed prerender instead of failing the whole build.
    staticGenerationRetryCount: 2,
  },
  images: {
    // Covers are served as-is (no Vercel image optimization costs).
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "cdn.myanimelist.net" },
    ],
  },
  // The share-image routes readFile() their fonts from assets/og (components/og/fonts.ts, literal paths): this
  // include is the backup that ships them in the trace even if the tracer misses a readFile.
  outputFileTracingIncludes: {
    "/user/og/**": ["./assets/og/*.ttf"],
    "/mylist/og/**": ["./assets/og/*.ttf"],
  },
  // NOTE: /anime → current season is resolved per request in proxy.ts.
  // Don't reintroduce it as a redirects() rule: those are evaluated at build time.
};

module.exports = nextConfig;
