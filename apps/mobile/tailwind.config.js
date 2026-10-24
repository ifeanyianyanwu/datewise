/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  // Later presets win: our tokens replace NativeWind's default colors and radii.
  presets: [require("nativewind/preset"), require("@datewise/tokens/tailwind-preset")],
  theme: {
    extend: {
      // Family names registered in src/app/_layout.tsx. Each family holds several
      // weights, so `font-body font-semibold` works the same as on web.
      fontFamily: {
        display: ["Archivo"],
        body: ["Figtree"],
        mono: ["DM Mono"],
      },
    },
  },
};
