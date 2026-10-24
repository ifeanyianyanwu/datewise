# Datewise

An AI date planner. The user picks a location, theme, time and budget. The backend fetches real nearby venues and the forecast, asks Gemini to arrange them into a timed itinerary, and pushes the result live. Each generation costs a credit.

**Sources of truth, one per topic:**
- `Datewise-Backend-Lab.md` is the **product and backend spec**: features, plan customization, credits, data model, API contract, the week-by-week curriculum and the UI screens. It's revised as decisions change; see its "What changed in this revision" section.
- `CLAUDE.md` (this file) covers **repo setup, design language, status and how we work.**

When a product or API decision changes, update the lab guide in the same change and don't duplicate it here. If the two disagree, raise it rather than picking one silently.

This is a **learning project**. The owner is learning production React Native and NestJS by building it. Understanding matters more than speed.

## Repo layout

```
apps/api        NestJS 12 (strict TS, Vitest, not Jest)
apps/web        Next.js 16 (App Router, Tailwind 4, src/ dir)
apps/mobile     Expo SDK 58, React Native 0.88, Expo Router (routes in src/app/)
packages/shared API types and Zod schemas from the API contract (not created yet)
packages/tokens design tokens for web and mobile (@datewise/tokens)
```

**How tokens flow:**
- `packages/tokens/src/tokens.ts` is the single source, holding plain values only.
- `pnpm tokens:build` runs `scripts/build.ts` (Node 24 runs TS directly) and generates two files:
  - `dist/theme.css`, the Tailwind 4 `@theme` imported by web.
  - `dist/tailwind-preset.cjs`, the Tailwind 3 preset for mobile, because stable NativeWind 4 still uses Tailwind 3.
- `dist/` is committed. Edit only `tokens.ts`, then rebuild.
- Class names are identical on both platforms (`bg-surface-1`, `text-ink-2`, `rounded-pill`, `text-display`, `cover-foodie`).
- Tailwind's default palette and radii are **removed**, so off-system classes like `bg-zinc-800` don't exist.
- Fonts are loaded per platform: `next/font` on web, defined in `globals.css` `@theme inline`; on mobile, `useFonts` in `src/app/_layout.tsx`.
- Covers on both platforms come from `coverBackground(theme)` in the tokens package. RN 0.88 renders CSS-style `radial-gradient` through `style={{ backgroundImage }}`.

**Mobile styling setup (NativeWind 4):**
- Wired in through `babel.config.js` (the `jsxImportSource` setting), `metro.config.js` (`inlineRem: 16`, so 1rem = 16px as on web), `tailwind.config.js` (the presets plus font families), `src/global.css`, and `nativewind-env.d.ts`.
- **`react-native-css-interop` must stay a direct dependency, pinned to the exact version NativeWind uses.** NativeWind's Babel step makes every file import it, and pnpm's isolated layout only lets the app import its own declared dependencies. After upgrading NativeWind, check this with `pnpm why react-native-css-interop`, which should show a single version.
- **Fonts:** expo-font 58 registers several weights under one family name, so `font-body font-semibold` works the same as on web. The families are `Archivo`, `Figtree` and `DM Mono`.
  - Import Google fonts **per weight** (`@expo-google-fonts/figtree/600SemiBold`). The package root pulls in every weight.
  - Wide display type uses the static `assets/fonts/ArchivoExpanded-ExtraBold.ttf` (from Omnibus-Type, under the OFL), because React Native can't set a variable font's width axis.
- **Verifying mobile changes:** run `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor`, and `npx expo export --platform ios --platform android --platform web --output-dir <scratch>`. The export catches Babel, Metro and resolution errors without needing a device.
- Turbopack transpiles workspace packages automatically, so there's no `transpilePackages` entry.

- pnpm 12 workspaces, Node 24 (`.nvmrc`), since Node 20 is end-of-life.
- Root scripts: `pnpm dev:web`, `pnpm dev:mobile`, `pnpm dev:api`.
- `backend/` and `frontend/` are old empty scaffolds, gitignored. Ignore them.
- `Streakmate-Backend-Lab.pdf` belongs to a different project. Don't commit it.

## Version gotchas (read before writing code)

These versions are newer than most training data and tutorials.

- **Expo and Next ship their own `AGENTS.md`** (`apps/mobile/AGENTS.md`, `apps/web/AGENTS.md`). Follow them: read the versioned docs (`docs.expo.dev/versions/v58.0.0/`, `node_modules/next/dist/docs/`) instead of relying on memory.
- **pnpm 12 ignores `.npmrc` for settings.** Settings such as `allowBuilds` and `nodeLinker` go in `pnpm-workspace.yaml`.
- **Expo works with pnpm's default isolated layout** (since SDK 54), so don't hoist. Check for duplicate React or React Native with `pnpm why react-native`.
- **Add mobile dependencies with `npx expo install <pkg>`**, never `pnpm add`, so versions match SDK 58.
- Checks before calling anything done: `pnpm --filter api build && pnpm --filter api test`, `pnpm --filter web build`, and `npx tsc --noEmit` plus `npx expo-doctor` in `apps/mobile`.

## Decisions so far

### Process
- **UI first, then backend.** Web screens first, then mobile, all built against a **typed mock API client** that follows the guide's contract (simulated latency, failures and live progress). An env var switches between the mock and the HTTP client, and each screen is connected to the real API as its endpoint lands.
- **Backend skips the guide's raw `node:http` and Express sessions** (the owner already knows them) and starts at Nest, week 1 session 3.
- **Claude writes the first version of each backend module.** The owner then changes and extends it, guided by "Your turn" exercises.
- **Mobile styling uses NativeWind v4, the stable release** (chosen 2026-10-24). The v5 release candidate supports Tailwind 4 but is marked not for production and was tested only on SDK 57. Revisit once v5 is stable. Web and mobile share one styling model. Web uses Tailwind and TanStack Query; mobile uses Expo Router, TanStack Query and `expo-secure-store` for tokens.

### Docker
Staged, following the guide: a services-only `docker-compose.yml` (MongoDB) at the start of the backend phase, the API joins in week 3 session 11, and the worker, queue Redis and Mailpit in sessions 13–14. **Web and mobile never run in Docker in dev**, because of Metro and device networking, QR codes, and slow file watching on macOS.

### Design language (v0.3, approved 2026-10-24)
Preview: https://claude.ai/artifact/6cT7ZGTPykbofELnhuZVXZ. It shows all the loop screens plus the customization UI (Shape it: places and evening; swap sheet; lock and reroll; cancel while generating). Build screens to match it. Inspired by Luma (event covers, pill buttons, glass panels, lots of space) and Discord (chunky wide display type, friendly shapes, compact list rows).

- **Dark only, with warm neutrals:** bg `#0E0D0C`, surfaces `#161513` / `#1E1C1A` / `#282624`, borders `#2A2826` / `#3B3835`, text `#F3EEE6` / `#B5AEA4` / `#8A837A`.
- **Beige is primary and means "you act":** `#E8DBC2` (hover `#F2E8D6`, pressed `#D8C8AA`), with `#1A1714` text on it. Used for the main button, selections, timeline dots and the credit coin.
- **Blue is secondary and means "the app is talking back":** `#6E95FF` (text `#93B0FF`). Used for live progress, links, focus rings and socket-driven updates. **Blue never fills a button.**
- **Covers are expressive content, not UI:** one gradient per theme (cozy "Ember", adventurous "Lagoon", foodie "Pepper", budget "Lime"). Used on plan headers, theme tiles and thumbnails, never on chrome.
- **Status colors:** success `#4FD69C`, warning `#F3B755`, danger `#F2636A`. Kept separate from both accents.
- **Type:** Archivo at 125% width, weight 800, for display (titles, plan names, buttons, balance). Figtree for body text. DM Mono for every number (times, distances, credits).
- **Shape:** buttons, chips and segments are pills. Inputs and tiles 12, cards and glass panels 20, sheets 28. Spacing is on a 4pt grid.
- **Rules:** one filled beige button per screen. Blue never asks for anything. Mood lives in covers. **Every action shows its price** ("Free" or "1 credit" on the button). Numbers are monospaced.
- **Customization UI:**
  - Pin status uses the status colors: green "open for your evening", amber "hours unknown, kept anyway", red "closed" with inline open alternatives and a Pin button.
  - Locked stops get a filled beige dot and a beige lock button.
  - The plan view's one beige button is "Reroll N unlocked stops".
  - Swap opens a bottom sheet with alternatives showing extra travel and closing time.
  - Live candidates while generating are outlined in blue.
- **Accessibility:** every text pairing is measured against WCAG AA, not eyeballed.

### Plan customization
Fully specified in the lab guide under "Plan customization". In short: **shape before, watch during, refine after.**
- **Before:** pins and exclusions, an evening outline, pace and travel, a note for the AI.
- **During:** progress showing candidate places, and cancel with a refund.
- **After:** swap a stop (free), reorder and retime (free), lock and reroll (first reroll free, then 1 credit).

**Two decisions that shape the UI:**
- **A closed pin gets immediate feedback.** When a venue is pinned, the form checks it against the plan's time window and, if it's closed then, says so straight away and offers open alternatives to pick. The check re-runs when the date or time changes. "Hours unknown" is allowed with a warning. The API re-checks on submit (`422 VENUE_CLOSED`).
- **The note is untrusted input.** The UI limits its length and labels it as a preference, not a command.

## Status and roadmap

- [x] Phase 0, Step 1: monorepo scaffold
- [x] Phase 0, Step 2: design system (v0.3 approved)
- [x] Phase 0, Step 3a: `packages/tokens` and web wiring
- [x] Phase 0, Step 3b: NativeWind v4 on mobile plus mobile fonts (checked on a real phone; matches web)
- [ ] **Phase 1: web screens on the mock client.** Planned steps; confirm the breakdown with the owner first:
  1. `packages/shared`: Zod schemas and TS types for the full API contract in the lab guide, including plan constraints, revisions, socket events, and error codes such as `OUT_OF_CREDITS` (402), `VENUE_CLOSED` (422) and `AI_BUSY`.
  2. A typed `ApiClient` interface with a **mock** implementation (in-memory data, simulated latency and failures, simulated socket progress and the closed-venue check) and an HTTP stub. `NEXT_PUBLIC_API_MODE=mock|http` picks one. TanStack Query provider.
  3. Web app shell and base components from the design (Button with a price badge, Chip, Input, Segmented, Cover, Sheet, Timeline stop), plus a lint rule that flags off-system Tailwind classes.
  4. Screens one at a time: auth, then plan a date with Shape it, then generating, then plan view with lock, swap and reroll, then my plans, then credits and settings.
- [ ] Phase 2: mobile screens on the mock client (reusing `packages/shared` and the mock client)
- [ ] Phase 3 onward: the backend lab, week by week, connecting screens as endpoints land

### Where we left off (2026-10-24)
- **Phase 0 is complete and committed.** The tree is clean except `Streakmate-Backend-Lab.pdf`, which is untracked on purpose.
- **Next session:** start Phase 1, Step 1 (`packages/shared`). Begin with the step rhythm's Plan and Decisions; don't jump straight to code.
- **Unanswered checkpoint:** the owner hasn't answered the Step 3b checkpoint questions. Offer the answers briefly at the start of the next session:
  1. Why NativeWind needs a Babel change: `className` is compiled into style objects at build time.
  2. Why pnpm isolated installs required declaring `react-native-css-interop`.
  3. Why barrel imports bloated the fonts.
- **Small follow-ups (not urgent):**
  - Remove Expo dependencies that only the demo used (`expo-device`, `@expo/ui`, `expo-glass-effect`, and possibly `expo-symbols` and `expo-web-browser`). Check usage first.
  - The owner may delete the old empty `backend/` and `frontend/` folders.
  - The `.claude/settings.json` in `apps/mobile` enables the Expo plugin and came from the template.

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
- **Get approval before big moves.** The owner asked for the plan to be shown before execution, and makes the key calls themself. Present options with **one clear recommendation** and the trade-off, then let them choose. Ask only about decisions that are genuinely theirs.
- **Brainstorm before building** for anything product-shaped. Lay out the ideas, sort them by cost and by what they teach, recommend a cut, then ask.
- **Grade checkpoint answers.** Answers tend to be short: confirm what's right and fill in what's missing (for example, "half right, the real reason is…"). Don't just accept them.
- **Design taste matters.** The owner pushes back on generic results and changes direction when something feels flat. Aim for a deliberate, distinctive look, and show designs as real screens, not swatch sheets.
- **Tie features to lessons.** Each feature should map to a concept from the lab guide. Point out the mapping, and push back on features that teach nothing.
- **Keep the docs current.** The owner doesn't want to work from an outdated spec. When a decision is made, update the lab guide (product and backend) or this file (setup, design, process) in the same step.
- **Be honest about mistakes.** When memory and the current docs disagree, say so and follow the docs. It's a useful lesson in itself.

**Commits.** Small, modular Conventional Commits (`feat(web): …`, `chore(workspace): …`), one logical change each, ordered foundations first. Commit only after the owner approves a step.

**Safety.** Never delete or overwrite the owner's files without asking first. Never commit secrets: `.env` is gitignored, and variable names go in `.env.example`. Keep lab services on the guide's ports (Mongo 27018, Redis 6381 and 6382, Mailpit 1025 and 8025).
