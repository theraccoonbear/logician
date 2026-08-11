import { computeVP } from '../selectors'
import type { PlayerId } from '../types/ids'
import type { GameState } from '../types/state'

const FORTRESS_POTENTIAL_WEIGHT = 0.5

/** Count of the player's own hexes holding a complete, not-yet-fortified Pool+Pyramid+Tower trio. */
function fortressPotential(state: GameState, playerId: PlayerId): number {
  let count = 0
  for (const hex of state.board) {
    const onHex = state.structures.filter((s) => s.hexId === hex.id && s.owner === playerId)
    const types = new Set(onHex.map((s) => s.type))
    if (types.has('Pool') && types.has('Pyramid') && types.has('Tower') && !types.has('Fortress')) count += 1
  }
  return count
}

/** Simple relative-position heuristic: own VP minus the strongest opponent's, with a small nudge toward fortress-ready hexes. */
export function evaluate(state: GameState, playerId: PlayerId): number {
  const myVP = computeVP(state, playerId)
  const opponentVPs = state.players.filter((p) => p.id !== playerId).map((p) => computeVP(state, p.id))
  const maxOpponentVP = opponentVPs.length > 0 ? Math.max(...opponentVPs) : 0
  return myVP - maxOpponentVP + fortressPotential(state, playerId) * FORTRESS_POTENTIAL_WEIGHT
}
