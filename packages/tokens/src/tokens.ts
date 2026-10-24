/**
 * Datewise design tokens: the single source of truth for web and mobile.
 *
 * Tokens are plain values (strings and numbers), never framework classes, so
 * any consumer can use them: Tailwind 4 on web, Tailwind 3 via NativeWind on
 * mobile, and plain JS where classes can't reach (status bar, navigation theme,
 * SVG fills, gradients).
 *
 * Names describe roles, not hues. When the accent changed from blue to beige,
 * only values changed here, and no component needed renaming.
 *
 * After editing, run `pnpm --filter @datewise/tokens build` to regenerate dist/.
 */

export const colors = {
  // Warm neutrals: charcoal with a slight brown bias so beige sits naturally.
  canvas: "#0E0D0C",
  "surface-1": "#161513",
  "surface-2": "#1E1C1A",
  "surface-3": "#282624",
  line: "#2A2826",
  "line-strong": "#3B3835",
  ink: "#F3EEE6",
  "ink-2": "#B5AEA4",
  "ink-3": "#8A837A",

  // Primary (beige): the user acting. Main button, selections, locked stops.
  primary: "#E8DBC2",
  "primary-hover": "#F2E8D6",
  "primary-press": "#D8C8AA",
  "primary-subtle": "rgba(232, 219, 194, 0.10)",
  "on-primary": "#1A1714",

  // Secondary (blue): the app talking back. Live progress, links, focus. Never fills a button.
  secondary: "#6E95FF",
  "secondary-text": "#93B0FF",
  "secondary-subtle": "rgba(110, 149, 255, 0.14)",

  // Status, kept apart from both accents.
  success: "#4FD69C",
  warning: "#F3B755",
  danger: "#F2636A",

  // Utility values Tailwind would otherwise provide. The default palette is
  // removed on purpose, so off-system colors like `bg-zinc-800` fail loudly.
  white: "#FFFFFF",
  transparent: "transparent",
  current: "currentColor",
} as const;

export const radius = {
  sm: 8,
  md: 12, // inputs, tiles
  lg: 20, // cards, glass panels
  xl: 28, // sheets, modals
  pill: 9999, // buttons, chips, segments
} as const;

/** Font roles. Each platform maps a role to the font files it loads. */
export const fontRoles = {
  display: {
    family: "Archivo",
    width: 125,
    note: "Titles, plan names, buttons, balance",
  },
  body: { family: "Figtree", note: "Everything you read" },
  mono: { family: "DM Mono", note: "Times, distances, credits" },
} as const;

/** Type scale in px. Line height in px; letter spacing in em. */
export const typeScale = {
  "display-xl": { size: 40, lineHeight: 40, letterSpacing: -0.02, weight: 800 },
  display: { size: 28, lineHeight: 30, letterSpacing: -0.02, weight: 800 },
  heading: { size: 18, lineHeight: 24, letterSpacing: 0, weight: 700 },
  "body-lg": { size: 17, lineHeight: 26, letterSpacing: 0, weight: 400 },
  body: { size: 15, lineHeight: 22, letterSpacing: 0, weight: 400 },
  caption: { size: 13, lineHeight: 18, letterSpacing: 0, weight: 400 },
  label: { size: 11, lineHeight: 11, letterSpacing: 0.1, weight: 600 },
  data: { size: 12, lineHeight: 16, letterSpacing: 0, weight: 500 },
} as const;

/** Motion durations (ms) and the shared easing curve. */
export const motion = {
  fast: 150,
  base: 200,
  slow: 320,
  easing: [0.2, 0.8, 0.2, 1] as const,
} as const;

export type ThemeKey = "cozy" | "adventurous" | "foodie" | "budget";

/**
 * Plan covers: expressive content colors, never UI chrome.
 * Stored as data (blob color + position + a dark base) and turned into a
 * layered radial-gradient by `coverBackground`, which both platforms render:
 * CSS `background-image` on web, `backgroundImage` on React Native 0.88+.
 */
export const covers: Record<
  ThemeKey,
  {
    name: string;
    blobs: readonly { color: string; x: number; y: number }[];
    base: readonly [string, string];
  }
> = {
  cozy: {
    name: "Ember",
    blobs: [
      { color: "#F2A96B", x: 15, y: 10 },
      { color: "#B8434F", x: 90, y: 30 },
    ],
    base: ["#3B1F3A", "#24141F"],
  },
  adventurous: {
    name: "Lagoon",
    blobs: [
      { color: "#49C6B5", x: 10, y: 0 },
      { color: "#3E6CF0", x: 95, y: 20 },
    ],
    base: ["#0F2B33", "#0B1A24"],
  },
  foodie: {
    name: "Pepper",
    blobs: [
      { color: "#F6C25B", x: 85, y: 5 },
      { color: "#E5534B", x: 5, y: 35 },
    ],
    base: ["#3A1712", "#22100D"],
  },
  budget: {
    name: "Lime",
    blobs: [
      { color: "#C8DB74", x: 20, y: 0 },
      { color: "#3E9E7B", x: 95, y: 40 },
    ],
    base: ["#16291F", "#0F1C16"],
  },
};

/** A cover as a layered radial-gradient, valid for CSS and React Native `backgroundImage`. */
export function coverBackground(key: ThemeKey): string {
  const { blobs, base } = covers[key];
  const layers = blobs.map((b) => `radial-gradient(110% 90% at ${b.x}% ${b.y}%, ${b.color} 0%, transparent 58%)`);
  return [...layers, `radial-gradient(120% 120% at 50% 110%, ${base[0]} 0%, ${base[1]} 70%)`].join(", ");
}
