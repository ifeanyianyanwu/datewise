# Datewise

An AI date planner, built as a **learning project**: the owner is learning production React Native and NestJS by building it. Understanding matters more than speed.

**`plan.md` is the source of truth** for the product, design language, API contract, data model, roadmap, current status and the backend curriculum. Read its "Status and next step" section at the start of every session. This file only covers repo setup, version gotchas and how we work. When a decision changes, update `plan.md` in the same change (and its decision log); don't duplicate it here. If the two disagree, raise it rather than picking one silently.

## Repo layout

```
apps/api        NestJS 12 (strict TS, Vitest, not Jest)
apps/web        Next.js 16 (App Router, Tailwind 4, src/ dir)
apps/mobile     Expo SDK 58, React Native 0.88, Expo Router (routes in src/app/)
packages/shared API types and Zod schemas from the API contract (not created yet)
packages/tokens design tokens for web and mobile (@datewise/tokens)
```

- pnpm 12 workspaces, Node 24 (`.nvmrc`).
- Root scripts: `pnpm dev:web`, `pnpm dev:mobile`, `pnpm dev:api`, `pnpm tokens:build`.
- `backend/` and `frontend/` are old empty scaffolds, gitignored. Ignore them.
- `Streakmate-Backend-Lab.pdf` belongs to a different project. Don't commit it.

**How tokens flow:**
- `packages/tokens/src/tokens.ts` is the single source, holding plain values only. Edit only this, then run `pnpm tokens:build`.
- The build (`scripts/build.ts`, run directly by Node 24) generates `dist/theme.css` (Tailwind 4 `@theme`, for web) and `dist/tailwind-preset.cjs` (Tailwind 3 preset, for mobile, since NativeWind 4 uses Tailwind 3). `dist/` is committed.
- Class names are identical on both platforms (`bg-surface-1`, `text-ink-2`, `rounded-pill`, `text-display`, `cover-foodie`).
- Tailwind's default palette and radii are **removed**, so off-system classes like `bg-zinc-800` don't exist.
- Fonts: `next/font` on web (wired in `globals.css` `@theme inline`); `useFonts` in `src/app/_layout.tsx` on mobile.
- Covers on both platforms come from `coverBackground(theme)`. RN 0.88 renders CSS `radial-gradient` through `style={{ backgroundImage }}`.
- Turbopack transpiles workspace packages automatically, so web has no `transpilePackages` entry.

**Mobile styling (NativeWind 4):**
- Wired through `babel.config.js` (`jsxImportSource`), `metro.config.js` (`inlineRem: 16`, so 1rem = 16px as on web), `tailwind.config.js` (presets plus font families), `src/global.css` and `nativewind-env.d.ts`.
- **`react-native-css-interop` must stay a direct dependency, pinned to the exact version NativeWind uses.** NativeWind's Babel step makes every file import it, and pnpm's isolated layout only lets the app import its declared dependencies. After upgrading NativeWind, `pnpm why react-native-css-interop` should show a single version.
- expo-font 58 registers several weights under one family (`Archivo`, `Figtree`, `DM Mono`), so `font-body font-semibold` works as on web. Import Google fonts **per weight** (`@expo-google-fonts/figtree/600SemiBold`); the package root pulls in every weight.
- Wide display type uses the static `assets/fonts/ArchivoExpanded-ExtraBold.ttf` (Omnibus-Type, OFL), because React Native can't set a variable font's width axis.

## Version gotchas (read before writing code)

These versions are newer than most training data and tutorials.

- **Expo and Next ship their own `AGENTS.md`** (`apps/mobile/AGENTS.md`, `apps/web/AGENTS.md`). Follow them: read the versioned docs (`docs.expo.dev/versions/v58.0.0/`, `node_modules/next/dist/docs/`) instead of relying on memory.
- **pnpm 12 ignores `.npmrc` for settings.** `allowBuilds`, `nodeLinker` and similar go in `pnpm-workspace.yaml`.
- **Expo works with pnpm's default isolated layout** (since SDK 54), so don't hoist. Check for duplicate React or React Native with `pnpm why react-native`.
- **Add mobile dependencies with `npx expo install <pkg>`**, never `pnpm add`, so versions match SDK 58.

**Checks before calling anything done:**
- API: `pnpm --filter api build && pnpm --filter api test`
- Web: `pnpm --filter web build`
- Mobile (in `apps/mobile`): `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor`, and `npx expo export --platform ios --platform android --platform web --output-dir <scratch>`. The export catches Babel, Metro and resolution errors without a device.

## How to work with the owner

**Roles.** On the frontend, act as a senior product designer and UI engineer, and write the code. On the backend, act as a senior systems engineer and mentor: write the first version of each module, then hand over pieces for the owner to change.

**Step rhythm.** Every step follows this pattern; never merge several steps into one.
1. **Plan:** what we're building and why it comes now.
2. **Decisions:** each real choice, its alternatives, and why you picked one. Skip trivia.
3. **Build:** small changes. Warn before touching more than about 10 files.
4. **Explain:** the important parts, especially where React Native or Nest differs from what a web React developer expects.
5. **Your turn:** one small hands-on exercise.
6. **Checkpoint:** 2–3 questions, then **stop and wait for approval**.

**What has worked so far:**
- **Get approval before big moves.** Show the plan before executing. The owner makes the key calls: present options with **one clear recommendation** and the trade-off. Ask only about decisions that are genuinely theirs.
- **Brainstorm before building** anything product-shaped. Lay out the ideas, sort them by cost and by what they teach, recommend a cut, then ask.
- **Grade checkpoint answers.** Answers tend to be short: confirm what's right and fill in what's missing ("half right, the real reason is…"). Don't just accept them.
- **Design taste matters.** The owner pushes back on generic results. Aim for a deliberate, distinctive look that matches the approved design (see `plan.md`), and show designs as real screens, not swatch sheets.
- **Tie features to lessons.** Each feature maps to a concept in `plan.md`. Point out the mapping, and push back on features that teach nothing.
- **Keep the docs current.** At the end of each step, update `plan.md` (status, roadmap checkboxes, decision log) or this file (setup, process) in the same change.
- **Be honest about mistakes.** When memory and the current docs disagree, say so and follow the docs.

**Commits.** Small, modular Conventional Commits (`feat(web): …`, `chore(workspace): …`), one logical change each, ordered foundations first. Commit only after the owner approves a step.

**Safety.** Never delete or overwrite the owner's files without asking first. Never commit secrets: `.env` is gitignored, and variable names go in `.env.example`. Keep lab services on their own ports (Mongo 27018, Redis 6381 and 6382, Mailpit 1025 and 8025) so they don't clash with the owner's work project.
