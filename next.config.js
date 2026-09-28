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
  // NOTE: /anime → current season is resolved per request in proxy.ts.
  // Don't reintroduce it as a redirects() rule: those are evaluated at build time.
};

module.exports = nextConfig;
