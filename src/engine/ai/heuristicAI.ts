import { getLegalBuildActions, getLegalCastActions } from '../legalActions'
import { applyAction } from '../reducer'
import type { GameAction } from '../types/actions'
import type { PlayerId } from '../types/ids'
import type { GameState } from '../types/state'
import type { AIStrategy } from './aiStrategy'
import { evaluate } from './evaluate'

/**
 * Greedy one-ply search: try every legal candidate through the real reducer, keep whichever
 * resulting state scores best for this player. Since `applyAction` is pure, no separate
 * simulation layer is needed. Effects with randomness (Combo, Randomize) are scored on a
 * single sampled outcome, not an expectation — a reasonable simplification for a v1 heuristic.
 */
function pickBest(state: GameState, playerId: PlayerId, candidates: GameAction[]): GameAction {
  let best = candidates[0]
  let bestScore = -Infinity
  for (const action of candidates) {
    const result = applyAction(state, action)
    if (!result.ok) continue
    const score = evaluate(result.state, playerId)
    if (score > bestScore) {
      bestScore = score
      best = action
    }
  }
  return best
}

export const HeuristicAI: AIStrategy = {
  chooseBuildAction: (state, playerId) => pickBest(state, playerId, getLegalBuildActions(state, playerId)),
  chooseCastAction: (state, playerId) => pickBest(state, playerId, getLegalCastActions(state, playerId)),
  // v1 never takes a hold card, so it's never in a trigger queue to respond from — always pass if asked.
  respondToTriggerWindow: (_state, playerId) => ({ type: 'PASS_TRIGGER_WINDOW', playerId }),
}
