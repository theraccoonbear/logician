import { getLegalBuildActions, getLegalCastActions } from '../legalActions'
import type { GameAction } from '../types/actions'
import type { AIStrategy } from './aiStrategy'

function pickRandom(candidates: GameAction[]): GameAction {
  return candidates[Math.floor(Math.random() * candidates.length)]
}

/** Uniformly-random legal moves — a cheap baseline for smoke tests and regression fixtures. */
export const RandomAI: AIStrategy = {
  chooseBuildAction: (state, playerId) => pickRandom(getLegalBuildActions(state, playerId)),
  chooseCastAction: (state, playerId) => pickRandom(getLegalCastActions(state, playerId)),
  respondToTriggerWindow: (_state, playerId) => ({ type: 'PASS_TRIGGER_WINDOW', playerId }),
}
