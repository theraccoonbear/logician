import { canBuildBasic, canBuildFortress } from './selectors'
import type { GameAction } from './types/actions'
import type { PlayerId } from './types/ids'
import type { GameState } from './types/state'
import type { StructureType } from './types/structure'

const BASIC_TYPES: readonly StructureType[] = ['Pool', 'Pyramid', 'Tower']

/**
 * Legal Phase-1 actions for a player. AI v1 scope: basic/Fortress builds and skipping —
 * it never plays a Major Arcana build enhancement (High Priestess), only humans do that.
 */
export function getLegalBuildActions(state: GameState, playerId: PlayerId): GameAction[] {
  const player = state.players.find((p) => p.id === playerId)
  if (!player) return []

  if (state.phase === 'setup') {
    const actions: GameAction[] = []
    for (const type of BASIC_TYPES) {
      if (state.structures.some((s) => s.owner === playerId && s.type === type)) continue
      for (const hex of state.board) {
        actions.push({ type: 'BUILD_STRUCTURE', playerId, hexId: hex.id, structureType: type })
      }
    }
    return actions
  }

  if (state.phase !== 'build') return []

  const actions: GameAction[] = [{ type: 'SKIP_BUILD', playerId }]
  for (const type of BASIC_TYPES) {
    for (const hex of state.board) {
      if (canBuildBasic(state, playerId, hex.id, type)) {
        actions.push({ type: 'BUILD_STRUCTURE', playerId, hexId: hex.id, structureType: type })
      }
    }
  }
  for (const hex of state.board) {
    if (canBuildFortress(state, playerId, hex.id)) {
      actions.push({ type: 'BUILD_STRUCTURE', playerId, hexId: hex.id, structureType: 'Fortress' })
    }
  }
  return actions
}

/**
 * Legal Phase-2 actions for a player. AI v1 scope: normal Logic+Effect spells and ending
 * the turn — it never plays a Major Arcana action (those need bespoke per-card targeting
 * that a first-pass heuristic doesn't attempt yet).
 */
export function getLegalCastActions(state: GameState, playerId: PlayerId): GameAction[] {
  const player = state.players.find((p) => p.id === playerId)
  if (!player || state.phase !== 'cast') return []

  const actions: GameAction[] = [{ type: 'END_TURN', playerId }]
  const minorTarots = state.tarotRow.filter((t) => t.kind === 'minor')
  for (const logic of player.logicHand) {
    for (const effect of player.effectHand) {
      for (const tarot of minorTarots) {
        actions.push({
          type: 'CAST_SPELL',
          playerId,
          logicCardId: logic.instanceId,
          effectCardId: effect.instanceId,
          tarotId: tarot.instanceId,
        })
      }
    }
  }
  return actions
}
