# Tech notes: libraries & graphical direction

Working notes on npm/TS libraries worth considering as the game grows, plus early
thinking on presentation for spell casting.

## Recommended libraries

The game is turn-based with no continuous render loop, so a full game engine
(Phaser, PixiJS, three.js) is overkill and would fight the existing React
component model (`HexTile.tsx`, `StructureToken.tsx`, etc.). Stay DOM/SVG-based
for the board and reach for targeted libraries instead:

- **Hex-grid math — `honeycomb-grid`.** `board.ts` currently has no adjacency
  model at all. If any future rule needs neighbors, distance, or line-of-sight,
  this is the standard TS-native axial/cube-coordinate library rather than
  hand-rolling it.
- **Drag-and-drop — `@dnd-kit/core`.** For dragging a Logic/Effect card onto a
  tarot target, or a structure onto a hex, instead of (or alongside) the
  current form/panel-based selection flow. Accessible (keyboard-operable) and
  actively maintained, unlike the older `react-dnd`.
- **Animation — `motion`** (the Framer Motion successor). Card draws,
  structure level-up feedback, the trigger-window interrupt sliding in, and
  (see below) cast overlays. Declarative, composes with React state rather
  than needing an imperative animation loop. Its shared-layout-id animation is
  the natural mechanism for "this card flies from my hand to the board."
- **State-machine modeling — `xstate`** (optional). The game already has an
  implicit machine (`setup → build → cast → awaitingTrigger`, plus reactive
  hold-card interrupts) encoded as a `phase` string plus reducer branches.
  XState would make the legal-transition graph explicit and give free state
  diagrams — worth it once more interrupt-stacking Major Arcana are added.
- **Save-data validation — `zod`.** `persistence.ts` currently does a raw
  `JSON.parse` from `localStorage` with a silent no-op fallback. A schema
  guard prevents a stale/malformed save from corrupting a loaded game as
  `GameState`'s shape evolves.
- **UI testing — `@testing-library/react`.** All 130 current tests are
  engine-level; there's no component/UI coverage yet for the ActionPanel
  forms or drag interactions.
- **Particle/burst effects — `tsparticles` (react-tsparticles) or the lighter
  `canvas-confetti`.** See cast overlays below.
- **Sound (low priority, optional) — `howler.js`.** Only once SFX for
  casts/builds is wanted.

Explicitly skip: a canvas/WebGL engine, swapping the custom reducer for
Redux/Zustand (it's pure, which is exactly what lets the AI "simulate" moves
by running real actions through the real reducer — don't lose that), and any
networking/multiplayer library unless remote play beyond hotseat is planned.

## Graphical direction: "cast overlay" effects

Idea worth prototyping: give spell/Major-Arcana resolution a dedicated
full-board overlay moment, in the spirit of modern digital card games —
think of how Slay the Spire dims the board and punches up card art with
light/particle flourishes when a card resolves. The goal is to make "a spell
is resolving" *read* clearly, not just update numbers instantly.

A rough effect stack, buildable with what's above:

1. **Dim/focus the board.** A semi-transparent overlay behind the acting
   card, done with a `motion` fade-in on a fixed-position div. Draws the eye
   to the cast without hiding board state entirely.
2. **Card flight.** The Logic + Effect + Tarot cards involved animate from
   hand/row position to a central "resolving" position using `motion`
   `layoutId` shared-element transitions — the same card component just
   moves, no separate sprite needed.
3. **Targeting beam/link.** A simple animated line or gradient trail from the
   resolving cards to each matched structure on the board — an SVG stroke
   with a `motion`-driven `strokeDashoffset` animation reads as "energy
   flowing to target" without needing a particle library.
4. **Impact burst per target.** A short particle burst (`tsparticles` or
   `canvas-confetti`, colored per effect type — e.g. green sparkle for
   Upgrade, red/dark for Downgrade or destroy, gold for Maximize) plus a
   brief scale/glow pulse on the affected `StructureToken`.
5. **Resolution settle.** Overlay fades out, structure levels update to their
   new values (ideally via `motion`'s number/layout transitions rather than
   an instant snap), cards move to their discard piles.

None of this needs to land at once — steps 1–2 alone (dim + card flight)
would already read much better than an instant state update, and 3–5 can
layer on incrementally. Worth prototyping against a single card type (e.g.
Wheel of Fortune's randomize burst) before generalizing to the full cast
pipeline.
