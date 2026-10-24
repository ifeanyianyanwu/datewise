/**
 * Generates platform files from src/tokens.ts:
 *   dist/theme.css             Tailwind 4 @theme for apps/web
 *   dist/tailwind-preset.cjs   Tailwind 3 preset for apps/mobile (NativeWind 4)
 *
 * Node 24 runs TypeScript directly (type stripping), so no build tool is needed:
 *   node scripts/build.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { colors, coverBackground, covers, radius, typeScale } from "../src/tokens.ts";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const header = "GENERATED from src/tokens.ts. Do not edit; run `pnpm --filter @datewise/tokens build`.";
const px = (n: number) => `${n}px`;
const em = (n: number) => `${n}em`;

// Tailwind 4 (web) --------------------------------------------------------------
// `--color-*: initial` clears Tailwind's default palette so only our colors exist.
const css = `/* ${header} */
@theme {
  --color-*: initial;
${Object.entries(colors).map(([k, v]) => `  --color-${k}: ${v};`).join("\n")}

  --radius-*: initial;
${Object.entries(radius).map(([k, v]) => `  --radius-${k}: ${px(v)};`).join("\n")}

${Object.entries(typeScale).map(([k, t]) => [
  `  --text-${k}: ${px(t.size)};`,
  `  --text-${k}--line-height: ${px(t.lineHeight)};`,
  `  --text-${k}--letter-spacing: ${em(t.letterSpacing)};`,
  `  --text-${k}--font-weight: ${t.weight};`,
].join("\n")).join("\n")}
}

@utility cover-* {
  background-image: --value(--cover-*);
}

@theme {
${(Object.keys(covers) as (keyof typeof covers)[]).map((k) => `  --cover-${k}: ${coverBackground(k)};`).join("\n")}
}
`;

// Tailwind 3 (mobile, NativeWind 4) -----------------------------------------------
// `theme.colors` (not `extend`) replaces the default palette, mirroring web.
// React Native's letter spacing is absolute, so em is converted to px per size.
const preset = {
  theme: {
    colors,
    borderRadius: Object.fromEntries(Object.entries(radius).map(([k, v]) => [k, px(v)])),
    extend: {
      fontSize: Object.fromEntries(Object.entries(typeScale).map(([k, t]) => [
        k,
        [px(t.size), {
          lineHeight: px(t.lineHeight),
          letterSpacing: px(+(t.size * t.letterSpacing).toFixed(2)),
          fontWeight: String(t.weight),
        }],
      ])),
    },
  },
};
const cjs = `// ${header}\nmodule.exports = ${JSON.stringify(preset, null, 2)};\n`;

mkdirSync(dist, { recursive: true });
writeFileSync(join(dist, "theme.css"), css);
writeFileSync(join(dist, "tailwind-preset.cjs"), cjs);
console.log("tokens: wrote dist/theme.css and dist/tailwind-preset.cjs");
