import { resolveSpell } from '../spellResolution'
import type { PlayerId } from '../types/ids'
import type { StructureType } from '../types/structure'
import type { TerrainType } from '../types/terrain'
import type { GameState } from '../types/state'
import type { MajorArcanaCard, MajorArcanaId, Operand, OperandKind } from '../types/tarot'
import type { MajorArcanaResult } from './handlers'

export const TERRAIN_TYPES: readonly TerrainType[] = ['Prairies', 'Forests', 'Mountains', 'Swamps']
export const STRUCTURE_TYPES: readonly StructureType[] = ['Pool', 'Pyramid', 'Tower', 'Fortress']

interface ForcedOperandSpec {
  casterCategory: OperandKind
  opponentCategory: OperandKind
  opponentDirection: 'clockwise' | 'counterclockwise'
}

// Which of the two categories the caster names vs. the designated opponent, per fig. 3.
const FORCED_OPERAND_SPEC: Partial<Record<MajorArcanaId, ForcedOperandSpec>> = {
  LOVERS: { casterCategory: 'level', opponentCategory: 'terrain', opponentDirection: 'clockwise' },
  JUSTICE: { casterCategory: 'terrain', opponentCategory: 'level', opponentDirection: 'clockwise' },
  HANGED_MAN: { casterCategory: 'terrain', opponentCategory: 'structureType', opponentDirection: 'counterclockwise' },
  MOON: { casterCategory: 'structureType', opponentCategory: 'terrain', opponentDirection: 'counterclockwise' },
  SUN: { casterCategory: 'level', opponentCategory: 'structureType', opponentDirection: 'counterclockwise' },
}

export function isForcedOperandMajor(id: MajorArcanaId): boolean {
  return id in FORCED_OPERAND_SPEC
}

/** Returns true for cards that require the non-active player to submit a choice before resolution. */
export function requiresOpponentChoice(id: MajorArcanaId): boolean {
  return id in FORCED_OPERAND_SPEC || id === 'DEVIL' || id === 'STAR' || id === 'TEMPERANCE'
}

/** Returns the OperandKind the opponent must choose for the given card, or undefined if not applicable. */
export function getOpponentChoiceCategory(id: MajorArcanaId): OperandKind | undefined {
  return FORCED_OPERAND_SPEC[id]?.opponentCategory
}

export function getForcedOperandSpec(id: MajorArcanaId) {
  return FORCED_OPERAND_SPEC[id]
}

/** The seat that names the opponent's condition: next seat clockwise, or previous seat counterclockwise, from the caster. */
export function designatedOpponentId(state: GameState, casterId: PlayerId, direction: 'clockwise' | 'counterclockwise'): PlayerId {
  const n = state.players.length
  const casterIndex = state.players.findIndex((p) => p.id === casterId)
  const offset = direction === 'clockwise' ? 1 : n - 1
  return state.players[(casterIndex + offset) % n].id
}

export function validateOperandValue(kind: OperandKind, value: unknown): string | null {
  if (kind === 'terrain' && !TERRAIN_TYPES.includes(value as TerrainType)) return `Invalid terrain: ${value}`
  if (kind === 'structureType' && !STRUCTURE_TYPES.includes(value as StructureType)) return `Invalid structure type: ${value}`
  if (kind === 'level' && (typeof value !== 'number' || value < 1 || value > 6)) return `Invalid level: ${value}`
  return null
}

export interface ForcedOperandParams {
  casterValue: TerrainType | StructureType | number
  opponentValue: TerrainType | StructureType | number
  /** Instance ids — the caster still plays a real Logic + Effect card from their hand. */
  logicCardId: string
  effectCardId: string
}

/**
 * Lovers / Justice / The Hanged Man / The Moon / The Sun all share one shape: the caster names
 * one condition, a designated opponent names a different-category condition, then it resolves
 * exactly like a normal Logic+Effect spell using those two named values as the operand pair.
 */
export function resolveForcedOperandSpell(
  state: GameState,
  casterId: PlayerId,
  tarot: MajorArcanaCard,
  params: ForcedOperandParams,
): MajorArcanaResult {
  const spec = FORCED_OPERAND_SPEC[tarot.id]
  if (!spec) return { ok: false, error: `${tarot.id} is not a forced-operand major` }

  const casterError = validateOperandValue(spec.casterCategory, params.casterValue)
  if (casterError) return { ok: false, error: casterError }
  const opponentError = validateOperandValue(spec.opponentCategory, params.opponentValue)
  if (opponentError) return { ok: false, error: opponentError }

  const operandA: Operand = { kind: spec.casterCategory, value: params.casterValue }
  const operandB: Operand = { kind: spec.opponentCategory, value: params.opponentValue }

  const result = resolveSpell(state, {
    casterId,
    logicCardId: params.logicCardId,
    effectCardId: params.effectCardId,
    operandA,
    operandB,
    tarot,
  })
  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, state: result.state }
}
