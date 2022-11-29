/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./node_modules/flowbite-react/**/*.js",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        tablet: "820px",
        // => @media (min-width: 820px) { ... }

        laptop: "1024px",
        // => @media (min-width: 1024px) { ... }

        laptop2: "1028px",
        // => @media (min-width: 1024px) { ... }

        desktop: "1280px",
        // => @media (min-width: 1280px) { ... }
      },
      animation: {
        slideInFromLeft: "slideInFromLeft 1s ease-in forwards",
      },
      keyframes: {
        slideInFromLeft: {
          "0%": {
            opacity: 0,
            filter: "blur(5px)",
            transform: "translateX(-50%)",
          },
          "100%": {
            opacity: 1,
            filter: "blur(0px)",
            transform: "translateX(0)",
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/line-clamp")],
};
