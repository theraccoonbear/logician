import { drawCards } from '../decks'
import { applyEffect } from '../levelResolution'
import { getAffectedStructures } from '../selectors'
import type { LogicCardId } from '../types/cards'
import type { PlayerId } from '../types/ids'
import type { GameState } from '../types/state'
import type { MajorArcanaCard, Operand } from '../types/tarot'
import { validateOperandValue } from './forcedOperand'
import type { MajorArcanaResult } from './handlers'

export interface WorldParams {
  condition1: Operand
  condition2: Operand
  logicKind: LogicCardId
}

/**
 * The World: played without any Logic/Effect card. The caster names two different-category
 * conditions and picks a Logic rule to combine them (not a physical card). Effect is always Upgrade 1.
 */
export function resolveWorld(state: GameState, _casterId: PlayerId, tarot: MajorArcanaCard, params: WorldParams): MajorArcanaResult {
  if (params.condition1.kind === params.condition2.kind) {
    return { ok: false, error: 'The two named conditions must be different categories' }
  }
  const c1Error = validateOperandValue(params.condition1.kind, params.condition1.value)
  if (c1Error) return { ok: false, error: c1Error }
  const c2Error = validateOperandValue(params.condition2.kind, params.condition2.value)
  if (c2Error) return { ok: false, error: c2Error }

  const affected = getAffectedStructures(state, {
    logicCardId: params.logicKind,
    operandA: params.condition1,
    operandB: params.condition2,
  })

  const affectedIds = new Set(affected.map((s) => s.id))
  const structures = state.structures.map((s) => {
    if (!affectedIds.has(s.id)) return s
    const result = applyEffect(s, 'UPGRADE_1')
    return result.destroyed ? s : { ...s, level: result.newLevel }
  })

  const tarotDraw = drawCards(state.tarotDeck, state.tarotDiscard, 1)

  const next: GameState = {
    ...state,
    structures,
    tarotDeck: tarotDraw.remaining,
    tarotDiscard: [...tarotDraw.remainingDiscard, tarot],
    tarotRow: [...state.tarotRow.filter((t) => t.instanceId !== tarot.instanceId), ...tarotDraw.drawn],
  }

  return { ok: true, state: next }
}
