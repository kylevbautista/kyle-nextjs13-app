/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    // Shared class maps live here too (lib/anime/statusBadge.ts).
    "./lib/**/*.{js,ts,jsx,tsx}",
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
      // Landing ("Reincarnation Protocol") tokens. Surfaces, borders and muted
      // text keep using the existing rgb(30/38/53/164) arbitrary values.
      colors: {
        sage: "#95ccff",
        night: {
          950: "#050915",
          900: "#0a1428",
          800: "#0e1d33",
        },
        slime: {
          200: "#bfe6ff",
          400: "#5daef1", // Tensura S1's AniList cover color
          600: "#2a7fd4",
          800: "#1b4f91",
        },
        gold: "#f5c451",
      },
      animation: {
        slideInFromLeft: "slideInFromLeft 1s ease-in forwards",
        fade: "fadeOut 2s ease-in-out",
        grow: "grow 400ms ease-in-out",

        // Landing motion intentionally ignores the OS reduced-motion preference.
        "slime-jiggle": "slime-jiggle 3.2s ease-in-out infinite",
        "slime-blink": "slime-blink 5.5s infinite",
        "slime-wake": "slime-wake 900ms ease-out both",
        "slime-poke": "slime-poke 450ms cubic-bezier(.34,1.56,.64,1)",
        // Identical frames under a second name: alternating the two restarts
        // the poke on every click without remounting the slime.
        "slime-poke-2": "slime-poke-2 450ms cubic-bezier(.34,1.56,.64,1)",
        "slime-gulp": "slime-gulp 500ms ease-out",
        "slime-sparkle": "slime-sparkle 900ms ease-out both",
        // Duration and delay are set inline per particle.
        "magicule-rise": "magicule-rise 12s linear infinite",
        twinkle: "twinkle 7s ease-in-out infinite",
        "spin-slow": "spin-slow 90s linear infinite",
        "spin-slower-reverse": "spin-slow 120s linear infinite reverse",
        "sage-scan": "sage-scan 700ms steps(28) 150ms both",
        caret: "caret 1s steps(1) infinite",
        sheen: "sheen 1.2s ease-out",
        "dot-flow": "dot-flow 1.6s linear infinite",
        // Expects the path to use pathLength="1" and stroke-dasharray="1".
        "draw-check": "draw-check 400ms ease-out both",
        "ring-out": "ring-out 900ms ease-out",
        "rise-in": "rise-in 600ms ease-out both",
        "fade-in": "fade-in 300ms ease-out both",
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
        fadeOut: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        grow: {
          "0%": { transform: "scale(0.975)" },
          "100%": { transform: "scale(1)" },
        },

        "slime-jiggle": {
          "0%, 100%": { transform: "scale(1, 1)" },
          "25%": { transform: "scale(1.03, 0.97)" },
          "50%": { transform: "scale(0.985, 1.02)" },
          "75%": { transform: "scale(1.01, 0.99)" },
        },
        "slime-blink": {
          "0%, 95.5%, 98.5%, 100%": { transform: "scaleY(1)" },
          "96%, 98%": { transform: "scaleY(0.1)" },
        },
        "slime-wake": {
          "0%": { transform: "translateY(0) scale(1, 1)" },
          "45%": { transform: "translateY(0) scale(1.05, 0.95)" },
          "75%": { transform: "translateY(-8px) scale(0.97, 1.04)" },
          "100%": { transform: "translateY(0) scale(1, 1)" },
        },
        "slime-poke": {
          "0%, 100%": { transform: "scale(1, 1)" },
          "25%": { transform: "scale(1.16, 0.82)" },
          "55%": { transform: "scale(0.92, 1.1)" },
          "80%": { transform: "scale(1.04, 0.97)" },
        },
        "slime-poke-2": {
          "0%, 100%": { transform: "scale(1, 1)" },
          "25%": { transform: "scale(1.16, 0.82)" },
          "55%": { transform: "scale(0.92, 1.1)" },
          "80%": { transform: "scale(1.04, 0.97)" },
        },
        "slime-gulp": {
          "0%, 100%": { transform: "scale(1, 1)" },
          "35%": { transform: "scale(1.14, 0.9)" },
          "70%": { transform: "scale(0.94, 1.08)" },
        },
        "slime-sparkle": {
          "0%": { opacity: 0, transform: "translateY(8px)" },
          "25%": { opacity: 1 },
          "100%": { opacity: 0, transform: "translateY(-26px)" },
        },
        "magicule-rise": {
          "0%": { opacity: 0, transform: "translateY(0)" },
          "15%": { opacity: 0.9 },
          "80%": { opacity: 0.5 },
          "100%": { opacity: 0, transform: "translateY(-180px)" },
        },
        twinkle: {
          "0%, 100%": { opacity: 0.6 },
          "50%": { opacity: 1 },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
        "sage-scan": {
          "0%": { clipPath: "inset(0 100% 0 0)" },
          "100%": { clipPath: "inset(0 0 0 0)" },
        },
        caret: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0 },
        },
        sheen: {
          "0%": { transform: "translateX(-130%) skewX(-18deg)" },
          "100%": { transform: "translateX(260%) skewX(-18deg)" },
        },
        "dot-flow": {
          "0%, 100%": { opacity: 0.3, transform: "scale(0.8)" },
          "40%": { opacity: 1, transform: "scale(1.2)" },
        },
        "draw-check": {
          from: { strokeDashoffset: "1" },
          to: { strokeDashoffset: "0" },
        },
        "ring-out": {
          "0%": { opacity: 0.7, transform: "scale(0.6)" },
          "100%": { opacity: 0, transform: "scale(2.6)" },
        },
        "rise-in": {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
