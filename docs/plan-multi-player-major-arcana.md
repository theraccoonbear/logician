# Plan: Multi-Player Major Arcana Decisions (Issue #26)

## Context

Several Major Arcana cards require the non-active player to make a decision (naming terrain, level, structure type). Currently, the active player supplies **both** their own choice and the opponent's choice in a single `PLAY_MAJOR_ARCANA` action with flat params. This does not match the tabletop rules where the opponent verbally states their own choice. The UI shows labels like "Opponent (clockwise) names the terrain" but the active player fills in the opponent's value themselves.

This plan introduces a genuine multi-player interaction: the opponent is prompted to make their own choice through a new game phase, with sequential locking and reset-on-change behavior.

## Cards in scope

**Phase 1 (this plan):** Forced-operand cards (Lovers, Justice, Hanged Man, Moon, Sun) + Devil
**Phase 2 (future):** Star, Temperance (each affected player chooses their own upgrades/downgrades)

Cards NOT changing: Tower, Strength (caster picks everything), Magician (caster picks from visible hand), Death, Judgement, Wheel, Hermit, Chariot, World.

---

## Engine changes

### 1. New phase and state fields

**File: `src/engine/types/state.ts`**

Add `'awaitingMajorChoice'` to the `Phase` union:
```ts
export type Phase = 'setup' | 'build' | 'cast' | 'awaitingTrigger' | 'awaitingMajorChoice'
```

Add to `GameState`:
```ts
pendingMajorChoice?: PendingMajorChoice
majorChoiceQueue?: PlayerId[]  // players who still need to submit input
```

Define `PendingMajorChoice` (new export):
```ts
export interface PendingMajorChoice {
  casterId: PlayerId
  majorId: MajorArcanaId
  tarot: MajorArcanaCard
  /** Partially-filled params. Grows as each player responds. */
  casterParams: Record<string, unknown>
  opponentParams: Record<string, unknown>
  /** For Devil: tracks which condition index (0 or 1) the current responder is filling. */
  devilConditionIndex?: number
}
```

### 2. New action types

**File: `src/engine/types/actions.ts`**

```ts
| { type: 'SUBMIT_OPPONENT_CHOICE'; playerId: PlayerId; choice: Record<string, unknown> }
```

The `choice` payload is card-specific:
- Forced-operand cards: `{ opponentValue: TerrainType | StructureType | number }`
- Devil: `{ condition: Operand }` (one condition at a time)

No new action needed for the caster's initial choice -- `PLAY_MAJOR_ARCANA` is reused but the reducer now splits its params into caster vs. opponent parts when the card requires opponent input.

### 3. Reducer changes

**File: `src/engine/reducer.ts`**

Modify `handlePlayMajorArcana`:
- When the card is a forced-operand card or Devil, **do not** finalize immediately
- Extract the caster's portion of params and store in `pendingMajorChoice.casterParams`
- Compute the opponent queue:
  - Forced-operand: single designated opponent via `designatedOpponentId()`
  - Devil: two opponents (clockwise, then next-clockwise); in 2P, same opponent twice
- Transition to `phase: 'awaitingMajorChoice'`

Add `handleSubmitOpponentChoice`:
- Validates `phase === 'awaitingMajorChoice'`, player is next in queue
- Validates the choice value via `validateOperandValue()`
- Stores choice in `pendingMajorChoice.opponentParams`
- Shifts the queue
- If queue is empty, assembles final params and calls `finalizePending()` (via the existing major-arcana pipeline)
- If queue is non-empty, stays in `awaitingMajorChoice` for next responder

Add `CANCEL_MAJOR_CHOICE` (or reuse Cancel via a new action):
- If the caster changes their mind (discussed in UI section), dispatches a cancel action
- Clears `pendingMajorChoice`, returns to `cast` phase

### 4. Helper: card classification

**File: `src/engine/majorArcana/forcedOperand.ts`**

Add `requiresOpponentChoice(majorId)` -- returns true for Lovers, Justice, Hanged Man, Moon, Sun, Devil.

### 5. Legal actions

**File: `src/engine/legalActions.ts`**

Add `getLegalMajorChoiceActions(state, playerId)`:
- When `phase === 'awaitingMajorChoice'` and `playerId` is next in queue
- Returns `SUBMIT_OPPONENT_CHOICE` with valid values for the expected category
- For forced-operand: returns one action per valid value in the opponent's category
- For Devil: returns one action per valid value in the current condition's category

Update `getLegalCastActions` to NOT generate `PLAY_MAJOR_ARCANA` for opponent-input cards when the player is the opponent (this is mostly relevant for AI).

### 6. AI changes

**File: `src/engine/ai/aiStrategy.ts`**

Add to `AIStrategy` interface:
```ts
chooseOpponentChoice(state: GameState, playerId: PlayerId): GameAction
```

**File: `src/engine/ai/heuristicAI.ts`**

Implement `chooseOpponentChoice`: picks the best `SUBMIT_OPPONENT_CHOICE` from `getLegalMajorChoiceActions()` using the same greedy one-ply evaluation as `pickBest`.

**File: `src/engine/ai/randomAI.ts`**

Implement `chooseOpponentChoice`: picks a random valid choice from `getLegalMajorChoiceActions()`.

**File: `src/ui/hooks/useAITurns.ts`**

Add handling for `awaitingMajorChoice` phase:
```ts
} else if (state.phase === 'awaitingMajorChoice') {
  const responder = state.majorChoiceQueue?.[0]
  if (responder && state.players.find(p => p.id === responder)?.isAI) {
    dispatch(ai.chooseOpponentChoice(state, responder))
  }
}
```

---

## UI changes

### 1. New phase rendering in ActionPanel

**File: `src/ui/components/ActionPanel/ActionPanel.tsx`**

Add case for `awaitingMajorChoice`:
- If current player is the one in the queue: show `OpponentChoicePanel`
- If current player is the caster waiting: show a "Waiting for {opponent}..." message
- Disabled state: all other controls (build, spell, major arcana) are grayed out

### 2. New component: OpponentChoicePanel

**File: `src/ui/components/ActionPanel/OpponentChoicePanel.tsx`**

Renders when it's the opponent's turn to choose:
- Shows context: "{Caster} played {Card Name}. Choose your response."
- For forced-operand: single `OperandPicker` for the expected category
- For Devil: `ConditionPicker` for the current condition
- Confirm button (dispatches `SUBMIT_OPPONENT_CHOICE`)
- Board preview of affected structures (based on partial params)

### 3. Caster waiting indicator

When the caster is waiting for the opponent:
- Show a prominent message: "Waiting for {Opponent} to choose..."
- Show the card played and what the opponent is deciding
- Disable all action buttons (no build, no spell, no other major arcana)
- A "Cancel" button to withdraw the choice (resets the chain)

### 4. Reset-on-change behavior

When the caster changes their operand choice while the opponent hasn't responded yet:
- The `CANCEL_MAJOR_CHOICE` action returns to `cast` phase
- The caster can re-select the card and re-enter their choice
- If the opponent already responded but the caster changes their operand, the opponent's choice is discarded

### 5. Pending decision indicator

A visual banner/badge on the board or player area showing:
- "Opponent input required" with the card icon
- Which player is being asked
- A pulsing/glowing effect to draw attention

---

## File change summary

| File | Change |
|---|---|
| `src/engine/types/state.ts` | Add `awaitingMajorChoice` phase, `PendingMajorChoice` interface, new state fields |
| `src/engine/types/actions.ts` | Add `SUBMIT_OPPONENT_CHOICE` action |
| `src/engine/reducer.ts` | Modify `handlePlayMajorArcana` to split params; add `handleSubmitOpponentChoice`; add cancel handler |
| `src/engine/majorArcana/forcedOperand.ts` | Add `requiresOpponentChoice()` helper |
| `src/engine/legalActions.ts` | Add `getLegalMajorChoiceActions()` |
| `src/engine/ai/aiStrategy.ts` | Add `chooseOpponentChoice` to interface |
| `src/engine/ai/heuristicAI.ts` | Implement `chooseOpponentChoice` |
| `src/engine/ai/randomAI.ts` | Implement `chooseOpponentChoice` |
| `src/ui/hooks/useAITurns.ts` | Handle `awaitingMajorChoice` phase |
| `src/ui/components/ActionPanel/ActionPanel.tsx` | Route `awaitingMajorChoice` to new panel |
| `src/ui/components/ActionPanel/OpponentChoicePanel.tsx` | **New** - opponent choice form |
| `src/ui/components/ActionPanel/majorForms/ForcedOperandForm.tsx` | Modify to only show caster's choice (not opponent's) |
| `src/ui/components/ActionPanel/majorForms/DevilForm.tsx` | Modify to only show caster's Logic card (conditions collected via opponent queue) |

## Test plan

| Test | What it covers |
|---|---|
| `src/engine/types/` (no new file) | Type-level; compile-time check |
| `src/engine/reducer.test.ts` | `PLAY_MAJOR_ARCANA` enters `awaitingMajorChoice` for forced-operand cards; `SUBMIT_OPPONENT_CHOICE` validates and advances queue; cancel returns to `cast`; queue order is correct; 2P Devil queues same opponent twice; rejects non-queue-player responses; finalizes after all choices collected |
| `src/engine/majorArcana/forcedOperand.test.ts` | `requiresOpponentChoice()` returns correct values; `resolveForcedOperandSpell` still works with collected params |
| `src/engine/majorArcana/devil.test.ts` | Devil flow with multi-step opponent choices |
| `src/engine/ai/ai.test.ts` | AI generates valid `SUBMIT_OPPONENT_CHOICE` actions; AI picks strategic opponent values |
| `src/engine/legalActions.test.ts` | `getLegalMajorChoiceActions` returns valid options; returns empty when not opponent's turn |

## Verification

1. `npm run test` -- all tests pass
2. `npm run lint` -- no new warnings
3. Manual test: 2P game, human plays Lovers, AI is opponent. Human selects operand, sees "Waiting for AI..." message, AI responds, human picks Logic+Effect and casts.
4. Manual test: AI plays Justice, human is opponent. AI plays card, human sees OpponentChoicePanel with level picker, confirms, AI casts.
5. Manual test: Cancel mid-flow. Human plays Moon, selects structure type, then changes mind. Cancel returns to cast phase.
6. Manual test: Devil in 2P. Human plays Devil, AI opponent provides two conditions sequentially, then human picks Logic card.
