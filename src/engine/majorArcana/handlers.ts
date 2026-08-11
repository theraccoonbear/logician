import { drawCards } from '../decks'
import { applyEffect } from '../levelResolution'
import type { PlayerId } from '../types/ids'
import { LEVEL_BOUNDS } from '../types/structure'
import type { Structure } from '../types/structure'
import type { GameState, HierophantOverride } from '../types/state'
import type { MajorArcanaCard, TarotCard } from '../types/tarot'

export type MajorArcanaResult = { ok: true; state: GameState } | { ok: false; error: string }

function ok(state: GameState): MajorArcanaResult {
  return { ok: true, state }
}

function err(error: string): MajorArcanaResult {
  return { ok: false, error }
}

/** Shared by every single-card major: discard the played card, draw one replacement into the row. */
function discardAndRefill(state: GameState, tarot: TarotCard): Pick<GameState, 'tarotRow' | 'tarotDeck' | 'tarotDiscard'> {
  const draw = drawCards(state.tarotDeck, state.tarotDiscard, 1)
  return {
    tarotRow: [...state.tarotRow.filter((t) => t.instanceId !== tarot.instanceId), ...draw.drawn],
    tarotDeck: draw.remaining,
    tarotDiscard: [...draw.remainingDiscard, tarot],
  }
}

export interface WheelParams {
  structureIds: string[]
  /** Set only when a held Hierophant intercepted one of the three targets. */
  hierophantOverride?: HierophantOverride
}

/** Wheel of Fortune: choose any three target structures. Randomize. */
export function resolveWheel(state: GameState, _casterId: PlayerId, tarot: MajorArcanaCard, params: WheelParams): MajorArcanaResult {
  const ids = params.structureIds
  if (!Array.isArray(ids) || ids.length !== 3 || new Set(ids).size !== 3) {
    return err('Wheel of Fortune requires exactly 3 distinct target structures')
  }
  const targets = ids.map((id) => state.structures.find((s) => s.id === id))
  if (targets.some((s) => !s)) return err('One or more target structures do not exist')
  if (targets.some((s) => s!.fortressed)) return err('Cannot target a fortressed structure')

  const targetIds = new Set(ids)
  const override = params.hierophantOverride
  const structures = state.structures.map((s) => {
    if (!targetIds.has(s.id)) return s
    if (override && s.id === override.structureId) return { ...s, level: override.newLevel }
    const result = applyEffect(s, 'RANDOMIZE')
    return result.destroyed ? s : { ...s, level: result.newLevel }
  })

  return ok({
    ...state,
    structures,
    ...discardAndRefill(state, tarot),
  })
}

export interface HermitParams {
  chosenTarotIds: string[]
}

/** The Hermit: discard the whole active row, search the deck for any 3 replacements. */
export function resolveHermit(state: GameState, _casterId: PlayerId, _tarot: MajorArcanaCard, params: HermitParams): MajorArcanaResult {
  const ids = params.chosenTarotIds
  if (!Array.isArray(ids) || ids.length !== 3 || new Set(ids).size !== 3) {
    return err('The Hermit requires choosing exactly 3 distinct tarot cards from the deck')
  }
  const chosen = ids.map((id) => state.tarotDeck.find((t) => t.instanceId === id))
  if (chosen.some((c) => !c)) return err('One or more chosen cards are not in the deck')

  const chosenSet = new Set(ids)
  const remainingDeck = state.tarotDeck.filter((t) => !chosenSet.has(t.instanceId))

  return ok({
    ...state,
    tarotRow: chosen as TarotCard[],
    tarotDeck: remainingDeck,
    tarotDiscard: [...state.tarotDiscard, ...state.tarotRow],
  })
}

export interface ChariotParams {
  hexId: string
  newLevels: Record<string, number>
}

/** The Chariot: redistribute levels among all structures on one unfortified hex. No creation, no destruction. */
export function resolveChariot(state: GameState, _casterId: PlayerId, tarot: MajorArcanaCard, params: ChariotParams): MajorArcanaResult {
  const onHex = state.structures.filter((s) => s.hexId === params.hexId)
  if (onHex.length === 0) return err('That hex has no structures to redistribute')
  if (onHex.some((s) => s.fortressed)) return err('Cannot target a fortified hex')

  const targetIds = new Set(onHex.map((s) => s.id))
  const givenIds = Object.keys(params.newLevels)
  if (givenIds.length !== targetIds.size || !givenIds.every((id) => targetIds.has(id))) {
    return err('Must redistribute exactly the structures already on that hex — no adding or removing pieces')
  }

  const originalTotal = onHex.reduce((sum, s) => sum + s.level, 0)
  const newTotal = Object.values(params.newLevels).reduce((sum, lvl) => sum + lvl, 0)
  if (newTotal !== originalTotal) return err('Redistribution must conserve the total level across the hex')

  for (const s of onHex) {
    const bounds = LEVEL_BOUNDS[s.type]
    const newLevel = params.newLevels[s.id]
    if (newLevel < bounds.floor || newLevel > bounds.max) {
      return err(`${s.type} cannot be set to level ${newLevel} (must be ${bounds.floor}-${bounds.max})`)
    }
  }

  const structures = state.structures.map((s) => (targetIds.has(s.id) ? { ...s, level: params.newLevels[s.id] } : s))

  return ok({
    ...state,
    structures,
    ...discardAndRefill(state, tarot),
  })
}

/** Death: destroy all structures at level <= 2 everywhere, bypassing fortress immunity. Fortresses themselves always survive. */
export function resolveDeath(state: GameState, _casterId: PlayerId, tarot: MajorArcanaCard): MajorArcanaResult {
  const structures = state.structures.filter((s) => s.type === 'Fortress' || s.level > 2)
  return ok({
    ...state,
    structures,
    ...discardAndRefill(state, tarot),
  })
}

/** Judgement: minimize every structure's level, including inside fortresses. The fortresses themselves remain. */
export function resolveJudgement(state: GameState, _casterId: PlayerId, tarot: MajorArcanaCard): MajorArcanaResult {
  const structures: Structure[] = state.structures.map((s) => ({ ...s, level: LEVEL_BOUNDS[s.type].floor }))
  return ok({
    ...state,
    structures,
    ...discardAndRefill(state, tarot),
  })
}
