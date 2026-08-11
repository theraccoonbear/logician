import { drawCards } from '../decks'
import { applyEffect } from '../levelResolution'
import type { PlayerId } from '../types/ids'
import type { GameState } from '../types/state'
import type { MajorArcanaCard } from '../types/tarot'
import type { MajorArcanaResult } from './handlers'

function discardAndRefill(state: GameState, tarot: MajorArcanaCard) {
  const draw = drawCards(state.tarotDeck, state.tarotDiscard, 1)
  return {
    tarotRow: [...state.tarotRow.filter((t) => t.instanceId !== tarot.instanceId), ...draw.drawn],
    tarotDeck: draw.remaining,
    tarotDiscard: [...draw.remainingDiscard, tarot],
  }
}

export interface TowerParams {
  ownStructureId: string
  opponentStructureIds: string[]
}

/** The Tower: sacrifice one of your own structures (level X); destroy opponent structures totaling exactly X. */
export function resolveTower(state: GameState, casterId: PlayerId, tarot: MajorArcanaCard, params: TowerParams): MajorArcanaResult {
  const own = state.structures.find((s) => s.id === params.ownStructureId)
  if (!own) return { ok: false, error: 'Your target structure does not exist' }
  if (own.owner !== casterId) return { ok: false, error: 'You must target your own structure' }
  if (own.fortressed) return { ok: false, error: 'Cannot target a fortressed structure' }

  if (params.opponentStructureIds.length === 0) return { ok: false, error: 'Must target at least one opponent structure' }
  const opponents = params.opponentStructureIds.map((id) => state.structures.find((s) => s.id === id))
  if (opponents.some((s) => !s)) return { ok: false, error: 'One or more opponent structures do not exist' }
  const opponentStructures = opponents as NonNullable<(typeof opponents)[number]>[]
  if (opponentStructures.some((s) => s.owner === casterId)) return { ok: false, error: 'Opponent targets must not belong to you' }
  if (opponentStructures.some((s) => s.fortressed)) return { ok: false, error: 'Cannot target a fortressed structure' }

  const total = opponentStructures.reduce((sum, s) => sum + s.level, 0)
  if (total !== own.level) return { ok: false, error: `Opponent targets must total exactly ${own.level}, got ${total}` }

  const destroyedIds = new Set([own.id, ...opponentStructures.map((s) => s.id)])
  const structures = state.structures.filter((s) => !destroyedIds.has(s.id))

  return { ok: true, state: { ...state, structures, ...discardAndRefill(state, tarot) } }
}

export interface StrengthParams {
  ownStructureId: string
}

/** Strength: downgrade 1 of your own structures; downgrade 1 on every unfortified opponent structure of that same type. */
export function resolveStrength(state: GameState, casterId: PlayerId, tarot: MajorArcanaCard, params: StrengthParams): MajorArcanaResult {
  const own = state.structures.find((s) => s.id === params.ownStructureId)
  if (!own) return { ok: false, error: 'Your target structure does not exist' }
  if (own.owner !== casterId) return { ok: false, error: 'You must target your own structure' }
  if (own.fortressed) return { ok: false, error: 'Cannot target a fortressed structure' }

  const toDowngrade = state.structures.filter(
    (s) => s.id === own.id || (s.owner !== casterId && s.type === own.type && !s.fortressed),
  )
  const destroyedIds = new Set<string>()
  const levelUpdates = new Map<string, number>()
  for (const s of toDowngrade) {
    const result = applyEffect(s, 'DOWNGRADE_1')
    if (result.destroyed) destroyedIds.add(s.id)
    else levelUpdates.set(s.id, result.newLevel)
  }

  const structures = state.structures
    .filter((s) => !destroyedIds.has(s.id))
    .map((s) => (levelUpdates.has(s.id) ? { ...s, level: levelUpdates.get(s.id)! } : s))

  return { ok: true, state: { ...state, structures, ...discardAndRefill(state, tarot) } }
}
