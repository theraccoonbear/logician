import type { PlayerId } from '../types/ids'
import type { GameState } from '../types/state'
import type { MajorArcanaCard, MajorArcanaId } from '../types/tarot'
import { resolveDevil } from './devil'
import { resolveForcedOperandSpell } from './forcedOperand'
import { resolveChariot, resolveDeath, resolveHermit, resolveJudgement, resolveWheel, type MajorArcanaResult } from './handlers'
import { resolveMagician } from './magician'
import { resolveStrength, resolveTower } from './selfAndOpponent'
import { resolveStar, resolveTemperance } from './starTemperance'
import { resolveWorld } from './world'

export type ImmediateHandler = (state: GameState, casterId: PlayerId, tarot: MajorArcanaCard, params: unknown) => MajorArcanaResult

/**
 * Registry of Major Arcana that resolve immediately when chosen as the Phase 2 action.
 * Hold/interrupt cards (Fool, Empress, Emperor, Hierophant, High Priestess) are not here —
 * they're routed through the trigger-window pipeline added in a later milestone.
 */
export const IMMEDIATE_MAJOR_ARCANA_HANDLERS: Partial<Record<MajorArcanaId, ImmediateHandler>> = {
  WHEEL: (state, casterId, tarot, params) => resolveWheel(state, casterId, tarot, params as never),
  HERMIT: (state, casterId, tarot, params) => resolveHermit(state, casterId, tarot, params as never),
  CHARIOT: (state, casterId, tarot, params) => resolveChariot(state, casterId, tarot, params as never),
  DEATH: (state, casterId, tarot) => resolveDeath(state, casterId, tarot),
  JUDGEMENT: (state, casterId, tarot) => resolveJudgement(state, casterId, tarot),
  LOVERS: (state, casterId, tarot, params) => resolveForcedOperandSpell(state, casterId, tarot, params as never),
  JUSTICE: (state, casterId, tarot, params) => resolveForcedOperandSpell(state, casterId, tarot, params as never),
  HANGED_MAN: (state, casterId, tarot, params) => resolveForcedOperandSpell(state, casterId, tarot, params as never),
  MOON: (state, casterId, tarot, params) => resolveForcedOperandSpell(state, casterId, tarot, params as never),
  SUN: (state, casterId, tarot, params) => resolveForcedOperandSpell(state, casterId, tarot, params as never),
  DEVIL: (state, casterId, tarot, params) => resolveDevil(state, casterId, tarot, params as never),
  WORLD: (state, casterId, tarot, params) => resolveWorld(state, casterId, tarot, params as never),
  MAGICIAN: (state, casterId, tarot, params) => resolveMagician(state, casterId, tarot, params as never),
  TOWER: (state, casterId, tarot, params) => resolveTower(state, casterId, tarot, params as never),
  STRENGTH: (state, casterId, tarot, params) => resolveStrength(state, casterId, tarot, params as never),
  STAR: (state, casterId, tarot, params) => resolveStar(state, casterId, tarot, params as never),
  TEMPERANCE: (state, casterId, tarot, params) => resolveTemperance(state, casterId, tarot, params as never),
}

export const IMPLEMENTED_MAJOR_ARCANA_IDS: ReadonlySet<MajorArcanaId> = new Set(
  Object.keys(IMMEDIATE_MAJOR_ARCANA_HANDLERS) as MajorArcanaId[],
)
