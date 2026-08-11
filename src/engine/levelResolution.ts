import type { EffectCardId } from './types/cards'
import { LEVEL_BOUNDS } from './types/structure'
import type { Structure } from './types/structure'

export type LevelResult = { destroyed: true } | { destroyed: false; newLevel: number }

/**
 * The single chokepoint for turning a level delta into a destroy/clamp outcome.
 * Effective level <= 0 destroys the structure; every structure type (including Pool,
 * whose floor is 1 like the rest) shares this same rule with no special case.
 */
export function resolveLevelChange(structure: Structure, delta: number): LevelResult {
  const bounds = LEVEL_BOUNDS[structure.type]
  const effective = structure.level + delta

  if (effective <= 0) return { destroyed: true }
  if (effective > bounds.max) return { destroyed: false, newLevel: bounds.max }
  if (effective < bounds.floor) return { destroyed: false, newLevel: bounds.floor }
  return { destroyed: false, newLevel: effective }
}

const UPGRADE_DELTA: Partial<Record<EffectCardId, number>> = {
  UPGRADE_1: 1,
  UPGRADE_2: 2,
  UPGRADE_3: 3,
  DOWNGRADE_1: -1,
  DOWNGRADE_2: -2,
  DOWNGRADE_3: -3,
}

export interface ApplyEffectOptions {
  /** Required only for the Combo effect: one flip result shared by the whole spell cast. */
  comboOutcome?: 'upgrade' | 'downgrade'
  /** Injectable for deterministic tests; defaults to Math.random. */
  random?: () => number
}

/** Applies a single Effect Card to a single structure, returning its destroy/clamp outcome. */
export function applyEffect(structure: Structure, effectCardId: EffectCardId, options: ApplyEffectOptions = {}): LevelResult {
  const random = options.random ?? Math.random

  if (effectCardId === 'MAXIMIZE') {
    return { destroyed: false, newLevel: LEVEL_BOUNDS[structure.type].max }
  }

  if (effectCardId === 'RANDOMIZE') {
    const bounds = LEVEL_BOUNDS[structure.type]
    const span = bounds.max - bounds.floor + 1
    const newLevel = bounds.floor + Math.floor(random() * span)
    return { destroyed: false, newLevel }
  }

  if (effectCardId === 'COMBO') {
    if (!options.comboOutcome) {
      throw new Error('COMBO effect requires a resolved comboOutcome')
    }
    return resolveLevelChange(structure, options.comboOutcome === 'upgrade' ? 1 : -1)
  }

  const delta = UPGRADE_DELTA[effectCardId]
  if (delta === undefined) {
    throw new Error(`Unknown effect card kind: ${effectCardId}`)
  }
  return resolveLevelChange(structure, delta)
}
