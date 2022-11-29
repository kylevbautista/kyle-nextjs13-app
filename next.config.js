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

    const getCurrentSeasonPath = (date = null) => {
      let month = date;
      if (!date) {
        const dateObject = new Date();
        month = dateObject.getUTCMonth();
      }

      if (month <= 1 || month === 11) {
        return "winter";
      }
      if (month >= 2 && month <= 4) {
        return "spring";
      }
      if (month >= 5 && month <= 7) {
        return "summer";
      }
      if (month >= 8 && month <= 10) {
        return "fall";
      }
      return "winter";
    };

    return [
      {
        source: "/anime",
        destination: `/anime/${year}/${getCurrentSeasonPath()}`,
        permanent: false,
      },
      {
        source: "/anime/:year",
        destination: `/anime/${year}/${getCurrentSeasonPath()}`,
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
