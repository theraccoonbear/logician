import { drawCards } from '../decks'
import { getAffectedStructures } from '../selectors'
import type { PlayerId } from '../types/ids'
import type { GameState } from '../types/state'
import type { LogicCardId } from '../types/cards'
import type { MajorArcanaCard, Operand } from '../types/tarot'
import { validateOperandValue } from './forcedOperand'
import type { MajorArcanaResult } from './handlers'

export interface DevilParams {
  condition1: Operand
  condition2: Operand
  /** Instance id — the acting player's own Logic card. There is no Effect card; the effect is always destroy. */
  logicCardId: string
}

function findInHand<T extends { instanceId: string }>(hand: T[], instanceId: string): T | undefined {
  return hand.find((c) => c.instanceId === instanceId)
}

/**
 * The Devil: the clockwise opponent names one condition, the next-clockwise opponent names a
 * second, different-category condition (in a 2-player game both fall to the same lone opponent).
 * Resolves with the caster's own Logic card and no Effect card — the effect is always destroy.
 */
export function resolveDevil(state: GameState, casterId: PlayerId, tarot: MajorArcanaCard, params: DevilParams): MajorArcanaResult {
  if (params.condition1.kind === params.condition2.kind) {
    return { ok: false, error: 'The two named conditions must be different categories' }
  }
  const c1Error = validateOperandValue(params.condition1.kind, params.condition1.value)
  if (c1Error) return { ok: false, error: c1Error }
  const c2Error = validateOperandValue(params.condition2.kind, params.condition2.value)
  if (c2Error) return { ok: false, error: c2Error }

  const caster = state.players.find((p) => p.id === casterId)
  if (!caster) return { ok: false, error: 'Unknown caster' }
  const logicCard = findInHand(caster.logicHand, params.logicCardId)
  if (!logicCard) return { ok: false, error: 'Logic card not in hand' }

  const affected = getAffectedStructures(state, {
    logicCardId: logicCard.kind as LogicCardId,
    operandA: params.condition1,
    operandB: params.condition2,
  })
  const affectedIds = new Set(affected.map((s) => s.id))
  const structures = state.structures.filter((s) => !affectedIds.has(s.id))

  const logicDraw = drawCards(state.logicDeck, state.logicDiscard, 1, state.prng)
  const tarotDraw = drawCards(state.tarotDeck, state.tarotDiscard, 1, logicDraw.prng)

  const next: GameState = {
    ...state,
    structures,
    logicDeck: logicDraw.remaining,
    logicDiscard: [...logicDraw.remainingDiscard, logicCard],
    tarotDeck: tarotDraw.remaining,
    tarotDiscard: [...tarotDraw.remainingDiscard, tarot],
    tarotRow: [...state.tarotRow.filter((t) => t.instanceId !== tarot.instanceId), ...tarotDraw.drawn],
    prng: tarotDraw.prng,
    players: state.players.map((p) =>
      p.id === caster.id
        ? { ...p, logicHand: [...p.logicHand.filter((c) => c.instanceId !== logicCard.instanceId), ...logicDraw.drawn] }
        : p,
    ),
  }

  return { ok: true, state: next }
}
