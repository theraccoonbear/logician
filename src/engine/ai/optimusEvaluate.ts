import { computeVP } from '../selectors'
import type { PlayerId } from '../types/ids'
import type { GameState } from '../types/state'

const FORTRESS_POTENTIAL_WEIGHT = 0.5
const CARD_ADVANTAGE_WEIGHT = 0.25
const OPPONENT_TRIO_PENALTY_WEIGHT = -0.5
const FORTRESSED_SECURITY_WEIGHT = 0.15
const PARTIAL_TRIO_WEIGHT = 0.25

/**
 * Counts a player's complete, unfortified trios (Pool + Pyramid + Tower) on the board.
 */
export function countUnfortifiedTrios(state: GameState, playerId: PlayerId): number {
  let count = 0
  for (const hex of state.board) {
    const onHex = state.structures.filter((s) => s.hexId === hex.id && s.owner === playerId)
    const types = new Set(onHex.map((s) => s.type))
    if (types.has('Pool') && types.has('Pyramid') && types.has('Tower') && !types.has('Fortress')) {
      count += 1
    }
  }
  return count
}

/**
 * Optimus relative-position evaluation function.
 * Evaluates the current state's goodness for `playerId` using multiple factors.
 */
export function optimusEvaluate(state: GameState, playerId: PlayerId): number {
  // 0. Handle terminal states first
  if (state.winner) {
    return state.winner === playerId ? 10000 : -10000
  }

  const myVP = computeVP(state, playerId)
  const player = state.players.find((p) => p.id === playerId)

  // 1. Calculate opponent VPs
  const opponentVPs = state.players.filter((p) => p.id !== playerId).map((p) => computeVP(state, p.id))
  const maxOpponentVP = opponentVPs.length > 0 ? Math.max(...opponentVPs) : 0

  // 2. Base Score: Relative VP
  let score = myVP - maxOpponentVP

  // 3. Strategic nudge: Fortress ready hexes (unfortified trios)
  score += countUnfortifiedTrios(state, playerId) * FORTRESS_POTENTIAL_WEIGHT

  // 4. Opponent Trio Sabotage: Penalize states where opponents are about to build a Fortress
  const totalOpponentTrios = state.players
    .filter((p) => p.id !== playerId)
    .reduce((sum, p) => sum + countUnfortifiedTrios(state, p.id), 0)
  score += totalOpponentTrios * OPPONENT_TRIO_PENALTY_WEIGHT

  // 4.5. Partial Trio Concentration: Reward having 2 out of 3 basic structures on the same unfortified hex
  let partialTrios = 0
  for (const hex of state.board) {
    const onHex = state.structures.filter((s) => s.hexId === hex.id && s.owner === playerId)
    const types = new Set(onHex.map((s) => s.type))
    if (!types.has('Fortress')) {
      const basicCount = ['Pool', 'Pyramid', 'Tower'].filter((t) => types.has(t as any)).length
      if (basicCount === 2) {
        partialTrios += 1
      }
    }
  }
  score += partialTrios * PARTIAL_TRIO_WEIGHT

  // 4.6. Fortressed Security: Reward having structures immune to spells inside a Fortress
  const fortressedCount = state.structures.filter((s) => s.owner === playerId && s.fortressed).length
  score += fortressedCount * FORTRESSED_SECURITY_WEIGHT

  // 5. Card Advantage: Give value to holding cards (more choices = better flexibility), including held Major Arcana
  if (player) {
    const cardCount = player.logicHand.length + player.effectHand.length + player.heldMajorArcana.length
    score += cardCount * CARD_ADVANTAGE_WEIGHT
  }

  // 6. Win Proximity Tuning: Transition to highly aggressive / defensive posture close to win limits
  const WIN_THRESHOLD = 32 // Close to victory
  if (myVP >= WIN_THRESHOLD) {
    // We are close to winning! Strongly prioritize our own victory points to finish the game
    score += (myVP - WIN_THRESHOLD) * 3.0
  }
  if (maxOpponentVP >= WIN_THRESHOLD) {
    // An opponent is close to winning! Heavily penalize letting them gain more points
    score -= (maxOpponentVP - WIN_THRESHOLD) * 4.0
  }

  return score
}
