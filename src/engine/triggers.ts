import { getAffectedStructures } from './selectors'
import type { PlayerId } from './types/ids'
import type { GameState, HierophantOverride, PendingResolution } from './types/state'
import type { Structure } from './types/structure'
import type { MajorArcanaId, Operand } from './types/tarot'
import type { TerrainType } from './types/terrain'

export interface HoldCardHandler {
  id: MajorArcanaId
  /** Whether this holder could meaningfully react to the given pending resolution. */
  canRespond(pending: PendingResolution, holderId: PlayerId): boolean
  transform(pending: PendingResolution, holderId: PlayerId, params: unknown): PendingResolution
}

const FOOL: HoldCardHandler = {
  id: 'FOOL',
  // Swapping A/B only makes sense for a normal Logic+Effect spell resolution.
  canRespond: (pending) => pending.kind === 'spell',
  transform: (pending) => {
    if (pending.kind !== 'spell') return pending
    return { ...pending, operandA: pending.operandB, operandB: pending.operandA }
  },
}

// Simplification: Empress's terrain-swap is scoped to the single pending resolution being
// interrupted (not a turn-wide board reinterpretation) — see plan's documented assumptions.
const EMPRESS: HoldCardHandler = {
  id: 'EMPRESS',
  canRespond: (pending) => pending.kind === 'spell' && (pending.operandA.kind === 'terrain' || pending.operandB.kind === 'terrain'),
  transform: (pending, _holderId, params) => {
    if (pending.kind !== 'spell') return pending
    const { from, to } = params as { from: TerrainType; to: TerrainType }
    const swapTerrain = (op: Operand): Operand => (op.kind === 'terrain' && op.value === from ? { kind: 'terrain', value: to } : op)
    return { ...pending, operandA: swapTerrain(pending.operandA), operandB: swapTerrain(pending.operandB) }
  },
}

const EMPEROR: HoldCardHandler = {
  id: 'EMPEROR',
  canRespond: () => true,
  transform: (pending) => ({ ...pending, cancelled: true }),
}

function isRandomizing(pending: PendingResolution): boolean {
  if (pending.kind === 'spell') return pending.effectCardKind === 'RANDOMIZE'
  return pending.majorId === 'WHEEL'
}

const HIEROPHANT: HoldCardHandler = {
  id: 'HIEROPHANT',
  canRespond: (pending) => isRandomizing(pending),
  transform: (pending, _holderId, params) => ({ ...pending, hierophantOverride: params as HierophantOverride }),
}

export const HOLD_CARD_HANDLERS: Partial<Record<MajorArcanaId, HoldCardHandler>> = {
  FOOL,
  EMPRESS,
  EMPEROR,
  HIEROPHANT,
}

export function isHoldCard(id: MajorArcanaId): boolean {
  return id in HOLD_CARD_HANDLERS
}

/** Seat order starting right after the caster, wrapping around to (and including) the caster last. */
function responseOrder(state: GameState, casterId: PlayerId): PlayerId[] {
  const n = state.players.length
  const casterIndex = state.players.findIndex((p) => p.id === casterId)
  const order: PlayerId[] = []
  for (let i = 1; i <= n; i += 1) {
    order.push(state.players[(casterIndex + i) % n].id)
  }
  return order
}

/** The structures that would actually be randomized by this pending resolution — Hierophant's only legal targets. */
export function computeRandomizeTargets(state: GameState, pending: PendingResolution): Structure[] {
  if (pending.kind === 'majorAction' && pending.majorId === 'WHEEL') {
    const ids = (pending.params as { structureIds?: string[] } | undefined)?.structureIds ?? []
    return ids.map((id) => state.structures.find((s) => s.id === id)).filter((s): s is Structure => Boolean(s))
  }
  if (pending.kind === 'spell' && pending.effectCardKind === 'RANDOMIZE') {
    const caster = state.players.find((p) => p.id === pending.casterId)
    const logicCard = caster?.logicHand.find((c) => c.instanceId === pending.logicCardInstanceId)
    if (!logicCard) return []
    return getAffectedStructures(state, { logicCardId: logicCard.kind, operandA: pending.operandA, operandB: pending.operandB })
  }
  return []
}

/** Players (in response order) who hold at least one card that could meaningfully react to this pending resolution. */
export function computeTriggerQueue(state: GameState, pending: PendingResolution): PlayerId[] {
  return responseOrder(state, pending.casterId).filter((playerId) => {
    const player = state.players.find((p) => p.id === playerId)
    if (!player) return false
    return player.heldMajorArcana.some((card) => {
      const handler = HOLD_CARD_HANDLERS[card.id]
      return handler && handler.canRespond(pending, playerId)
    })
  })
}
