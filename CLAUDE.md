# Logician — where things live

Logician is a browser port of a tabletop boolean-logic/tarot game. The codebase splits
cleanly into two halves: a **pure game engine** (no React, no I/O) and a **React UI** that
reads/dispatches against it. The full tabletop ruleset lives in [`docs/rules.md`](docs/rules.md).

The engine is a single reducer: `(state, action) => state`, in `src/engine/reducer.ts`. Every
rule — build, cast, major arcana effects — runs through that one function, with no side
effects. This matters architecturally: the AI (`src/engine/ai/`) plays by simulating candidate
moves through the *same* reducer real players use, not a separate code path. If you change a
rule, you change it once, in the engine, and both humans and AI see the new behavior.

## `src/engine/` — pure game engine

| File/dir | Purpose |
|---|---|
| `reducer.ts` | Root reducer. Every `GameAction` (build, cast spell, play major arcana, end turn, ...) goes through here. |
| `setup.ts` | `createInitialGameState` — new-game setup (seats, starting hands, board). |
| `board.ts` | `createBoard` — the 10-hex board and its terrain layout. |
| `decks.ts` | Deck construction, shuffling, drawing (logic/effect/tarot). |
| `selectors.ts` | Derived-state queries: `getHex`, `computeVP`, `canBuildBasic`, `canBuildFortress`, etc. |
| `legalActions.ts` | `getLegalBuildActions`, `getLegalCastActions` — what a player can currently do. |
| `predicates.ts` | `matchesOperand`, `LOGIC_PREDICATES`, `getLogicMatcher` — the actual boolean-logic evaluation. |
| `spellResolution.ts` | `resolveSpell`, `setFortressedForHex` — applying a cast Logic+Effect+Tarot combo. |
| `levelResolution.ts` | `resolveLevelChange`, `applyEffect` — clamping/destroying structures against `LEVEL_BOUNDS`. |
| `triggers.ts` | The 4 **hold-then-play** major arcana: Fool, Empress, Emperor, Hierophant — plus trigger-window plumbing (`computeTriggerQueue`, `computeRandomizeTargets`). **Not** in `majorArcana/`, see below. |
| `majorArcana/` | The 15 **immediate-resolve** major arcana. See table below. |
| `ai/` | AI opponents: `aiStrategy.ts` (interface), `heuristicAI.ts`, `randomAI.ts`, `evaluate.ts` (position scoring), `index.ts` (`createAI(difficulty)`). |
| `types/` | Type-only modules: `state.ts`, `actions.ts`, `cards.ts`, `ids.ts`, `tarot.ts`, `structure.ts` (incl. `LEVEL_BOUNDS`), `terrain.ts` (incl. `SUIT_TERRAIN`). |

### Where do major arcana behaviors live?

22 cards, split by *when* they resolve:

- **15 resolve immediately** when played, in `src/engine/majorArcana/`:

  | File | Cards |
  |---|---|
  | `handlers.ts` | Wheel of Fortune, Hermit, Chariot, Death, Judgement |
  | `selfAndOpponent.ts` | Tower, Strength |
  | `starTemperance.ts` | Star, Temperance |
  | `devil.ts` | Devil |
  | `world.ts` | World |
  | `magician.ts` | Magician |
  | `forcedOperand.ts` | Lovers, Justice, Hanged Man, Moon, Sun (one shared resolver — all four name-a-condition cards) |

  All wired through `IMMEDIATE_MAJOR_ARCANA_HANDLERS` in `majorArcana/registry.ts` (which also
  derives `IMPLEMENTED_MAJOR_ARCANA_IDS`), dispatched from `reducer.ts`'s `PLAY_MAJOR_ARCANA`/
  `PLAY_HELD_ARCANA` cases.

- **4 are "hold, then play later"**, in `src/engine/triggers.ts` (one level up, not
  `majorArcana/`): Fool, Empress, Emperor, Hierophant.

- **High Priestess** is a build-time modifier handled inline in `reducer.ts`/`BuildPanel.tsx`
  rather than either of the above. A comment in `registry.ts` notes it's *intended* for the
  hold-card pipeline eventually but isn't wired into `HOLD_CARD_HANDLERS` yet — known gap, not
  yet fixed.

Each engine file above has a co-located `*.test.ts`.

On the UI side, `src/ui/components/ActionPanel/majorForms/` has one form component per major
arcana card that needs bespoke input (target picking, naming conditions, etc.) — the UI-side
counterpart to `engine/majorArcana/`. `src/ui/majorArcanaDescriptions.ts` has the canonical
plain-English one-liner per card (used by the in-app Help modal and tarot row alike — pull from
here rather than writing a new description if you need card text).

## `src/ui/` — React layer

| File/dir | Purpose |
|---|---|
| `GameProvider.tsx` | Context/provider around the engine: holds `GameState`, exposes `dispatch`/`startGame`/`newGame`, wires save/load. |
| `persistence.ts` | Save/load game state + small prefs (player name, show-rules-on-start). |
| `storage.ts` | Thin localStorage wrapper underneath `persistence.ts` — get/set/remove that never throws. |
| `assetUrl.ts` | Resolves `public/` asset paths against Vite's `BASE_URL` (dev is `/`, the GitHub Pages build is `/logician/`). Every `/img/...` reference should go through this. |
| `cardArt.ts`, `tarotArt.ts`, `structureArt.ts`, `terrainArt.ts`, `fortressArt.ts` | Lookup tables mapping card/structure/terrain ids to image asset paths and (for `cardArt.ts`) sprite-sheet/box positioning. |
| `operandLabels.ts`, `majorArcanaDescriptions.ts`, `cardLabels.ts` | Human-readable label/description text, kept separate from engine logic. |
| `playerColors.ts` | Per-player color assignment for UI theming. |
| `hooks/` | `useGameEngine`, `useAITurns`, `useFitScale`, `useOrientation`. |
| `components/` | See below. |

`components/` subfolders:

- **`Board/`** — `Board.tsx`, `HexTile.tsx`, `StructureToken.tsx` — the hex-grid board.
- **`Hand/`** — `LogicCardHand.tsx`, `EffectCardHand.tsx`, `GameCard.tsx` — the player's hand.
- **`TarotRow/`** — `TarotRow.tsx`, `TarotCardView.tsx` — the three face-up tarot cards.
- **`ActionPanel/`** — turn-action UI: `ActionPanel.tsx` (phase orchestration), `BuildPanel.tsx`,
  `SpellBuilder.tsx`, `MajorArcanaPanel.tsx`, `TriggerWindowPanel.tsx`, and `majorForms/` (one
  form per major arcana card needing input — see above).
- Top level: `GameView.tsx` (main screen shell), `SetupScreen.tsx` (new-game config),
  `MenuBar.tsx`, `TurnIndicator.tsx`, `VPTracker.tsx`, `GameLog.tsx`, `RulesModal.tsx` +
  `RulesContent.tsx` (in-app Help).

## Tests

Co-located as `*.test.ts` next to the file they cover — no separate `tests/` tree. All 16 test
files are under `src/engine/` (plus one root `src/smoke.test.ts`); **the UI layer currently has
no test coverage**. `npm run test` runs the suite (Vitest).

## Docs, tools, build

- `docs/rules.md` — full tabletop ruleset. `docs/libraries.md` — dependency notes. `docs/img/` —
  screenshots.
- `tools/gimp-asset-producer.scm` — GIMP script-fu helper for producing card/structure art.
- `vite.config.ts` — `base: '/logician/'` only on production builds (GitHub Pages subpath).
- `.github/workflows/deploy-pages.yml` — build + deploy to GitHub Pages on push to `main`.
  `.github/workflows/deploy-pr-preview.yml` — every open PR gets a live preview at
  `gh-pages/pr-<N>/`, updated on every push, removed when the PR closes; posts/updates a sticky
  comment on the PR with the link. Both deploy to the **same `gh-pages` branch** (live site at
  its root, `keep_files: true` so neither wipes the other's content) — GitHub Pages only
  supports one source per repo, so PR previews couldn't use a separate mechanism like
  `actions/deploy-pages` without conflicting with the live site. Both workflows share one
  `concurrency` group (`gh-pages-deploy`, queued not cancelled) since anything pushing to that
  branch needs to be mutually exclusive with everything else pushing to it. **CI test validation is enforced** — test suites, lint checks, and compilations are run on pull requests via `.github/workflows/ci.yml` and directly block deployments/previews upon failure. Corrected gap.

### Image assets: source vs. shipped

`src-assets/img/` holds full-resolution source art (committed) — the tarot deck, structure/
fortress art, card frames/labels/operator art, terrain, UI chrome. `public/img/` is **generated**
from it by `scripts/resize-assets.mjs` (sharp) and is gitignored, not committed — a build
artifact, not a source. `npm run dev`/`npm run build` both regenerate it automatically via
`predev`/`prebuild`; the script is incremental (skips anything already up to date), so repeat
runs are near-instant. Per-directory target sizes in `resize-assets.mjs` are each asset class's
largest actual CSS render size × a DPI ceiling — see the file's own header comment and issue #4
for the full rationale. Result: ~45MB of source art ships as ~11MB.

If you add new art, drop the full-resolution file in `src-assets/img/` (mirroring `public/img/`'s
existing subfolder structure) — don't touch `public/img/` directly, it'll be overwritten on the
next `dev`/`build`. If a new asset class doesn't fit an existing resize rule, add one; the script
throws on an unmatched file rather than silently shipping it unresized.

`src/ui/cardArt.ts`'s `LOGIC_BANDS`/`EFFECT_BANDS` are pixel coordinates hardcoded against the
*shipped* (resized) sprite sheet's exact dimensions, not the source. Re-run
`python3 scripts/scan-label-bands.py public/img/cards/logic_labels.png` (and the `effect_`
equivalent) to get fresh values whenever the source art in `src-assets/img/cards/` changes, or
whenever the `cards/` resize rule in `resize-assets.mjs` changes — either shifts every band.

## Conventions

- **Feature branches + PRs against `main`.** Don't commit/push directly to `main` — branch first
  (`git switch -c ...`), open a PR.
- **Branch naming**: `<type>/<short-kebab-case-desc>-<gh-issue-num>`, e.g. `feat/hex-tile-bevel-8`
  or `fix/pool-level-bounds-12`. `<type>` is `feat`, `fix`, `spike`, `docs`, `chore`, or similar.
  Omit the trailing issue number only when the branch has no corresponding issue.
- **Pure engine, no exceptions.** New rules/effects belong in `src/engine/`, expressed as
  reducer logic with no side effects and no UI dependency — the AI depends on this.
