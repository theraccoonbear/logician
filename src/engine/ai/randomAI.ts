import { getLegalBuildActions, getLegalCastActions } from '../legalActions'
import { nextRandom } from '../prng'
import type { GameAction } from '../types/actions'
import type { GameState } from '../types/state'
import type { AIStrategy } from './aiStrategy'

function pickRandom(candidates: GameAction[], state: GameState): { action: GameAction; prng: GameState['prng'] } {
  const { value, prng } = nextRandom(state.prng)
  const index = Math.floor(value * candidates.length)
  return { action: candidates[index], prng }
}

/** Uniformly-random legal moves — a cheap baseline for smoke tests and regression fixtures. */
export const RandomAI: AIStrategy = {
  chooseBuildAction: (state, playerId) => pickRandom(getLegalBuildActions(state, playerId), state).action,
  chooseCastAction: (state, playerId) => pickRandom(getLegalCastActions(state, playerId), state).action,
  respondToTriggerWindow: (_state, playerId) => ({ type: 'PASS_TRIGGER_WINDOW', playerId }),
}
