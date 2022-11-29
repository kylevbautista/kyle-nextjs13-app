/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: true,
  },
  // reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "s4.anilist.co",
      },
    ],
    unoptimized: true,
  },
  async redirects() {
    const dateObject = new Date();
    const year = dateObject.getUTCFullYear();
    return [
      {
        source: "/anime",
        destination: `/${year}`,
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
