import { getLogicMatcher } from './predicates'
import type { LogicCardId } from './types/cards'
import type { HexId, PlayerId } from './types/ids'
import type { Structure, StructureType } from './types/structure'
import type { GameState } from './types/state'
import type { Operand } from './types/tarot'

export function getHex(state: GameState, hexId: HexId) {
  const hex = state.board.find((h) => h.id === hexId)
  if (!hex) throw new Error(`Unknown hex: ${hexId}`)
  return hex
}

export interface AffectedStructuresQuery {
  logicCardId: LogicCardId
  operandA: Operand
  operandB: Operand
}

export interface AffectedStructuresOptions {
  /** Only Death and Judgement bypass fortress immunity. */
  bypassFortress?: boolean
}

/**
 * The single chokepoint for turning a Logic Card + operand pair into the set of
 * targeted structures. Fortress immunity is enforced here, not per Major Arcana handler.
 */
export function getAffectedStructures(
  state: GameState,
  query: AffectedStructuresQuery,
  options: AffectedStructuresOptions = {},
): Structure[] {
  const matcher = getLogicMatcher(query.logicCardId, query.operandA, query.operandB)

  return state.structures.filter((structure) => {
    if (structure.fortressed && !options.bypassFortress) return false
    const hex = getHex(state, structure.hexId)
    return matcher(structure, hex)
  })
}

export function computeVP(state: GameState, playerId: PlayerId): number {
  return state.structures
    .filter((s) => s.owner === playerId)
    .reduce((sum, s) => sum + s.level, 0)
}

export function structuresOnHexForOwner(state: GameState, hexId: HexId, owner: PlayerId): Structure[] {
  return state.structures.filter((s) => s.hexId === hexId && s.owner === owner)
}

export function ownerHasStructureType(state: GameState, owner: PlayerId, structureType: StructureType): boolean {
  return state.structures.some((s) => s.owner === owner && s.type === structureType)
}

export function canBuildBasic(state: GameState, owner: PlayerId, hexId: HexId, structureType: StructureType): boolean {
  return !state.structures.some((s) => s.owner === owner && s.hexId === hexId && s.type === structureType)
}

export function canBuildFortress(state: GameState, owner: PlayerId, hexId: HexId): boolean {
  const onHex = structuresOnHexForOwner(state, hexId, owner)
  const types = new Set(onHex.map((s) => s.type))
  return types.has('Pool') && types.has('Pyramid') && types.has('Tower') && !types.has('Fortress')
}
