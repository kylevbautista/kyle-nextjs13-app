/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: true,
    /**
     * To stop rate limiting, I am forcing nextjs
     * to ssg on 1 thread to that there is no parellel
     * ssg builds to avoid api throttling during build.
     *
     * If I had unlimited access to api, I would revert the below code
     */
    workerThreads: false,
    cpus: 1,
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
    let year = dateObject.getUTCFullYear();
    const currentMonth = dateObject.getUTCMonth();
    if (currentMonth === 11) {
      year = year + 1;
    }

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
