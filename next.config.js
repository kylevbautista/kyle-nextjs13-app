/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    optimizeCss: true,
    serverActions: true,
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
  webpack: (config, options) => {
    config.module.rules.push({
      test: /\.(graphql|gql)/,
      exclude: /node_modules/,
      loader: "graphql-tag/loader",
    });

    return config;
  },
  // async rewrites() {
  //   /**
  //    * Mask animev3 as anime for testing
  //    */
  //   return {
  //     beforeFiles: [
  //       {
  //         source: "/anime",
  //         destination: "/animev3", // Matched parameters can be used in the destination
  //       },
  //       {
  //         source: "/anime/:slug*",
  //         destination: "/animev3/:slug*", // Matched parameters can be used in the destination
  //       },
  //     ],
  //   };
  // },
  async redirects() {
    const dateObject = new Date();
    let year = dateObject.getUTCFullYear();
    const currentMonth = dateObject.getUTCMonth();
    // if (currentMonth === 11) {
    //   year = year + 1;
    // }

    const getCurrentSeasonPath = (date = null, shifted = false) => {
      let month = date;
      if (!date) {
        const dateObject = new Date();
        month = dateObject.getUTCMonth();
      }

      if (shifted) {
        if (month <= 2) {
          return "winter";
        }
        if (month >= 3 && month <= 5) {
          return "spring";
        }
        if (month >= 6 && month <= 8) {
          return "summer";
        }
        if (month >= 9 && month <= 11) {
          return "fall";
        }
      } else {
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
      }
      return "winter";
    };

    return [
      {
        source: "/anime",
        destination: `/anime/${year}/${getCurrentSeasonPath(null, true)}`,
        permanent: false,
      },
      {
        source: "/anime/:year",
        destination: `/anime/${year}/${getCurrentSeasonPath(null, true)}`,
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
