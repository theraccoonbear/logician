import type { GameAction } from '../types/actions'
import type { PlayerId } from '../types/ids'
import type { GameState } from '../types/state'

export interface AIStrategy {
  chooseBuildAction(state: GameState, playerId: PlayerId): GameAction
  chooseCastAction(state: GameState, playerId: PlayerId): GameAction
  respondToTriggerWindow(state: GameState, playerId: PlayerId): GameAction
  chooseOpponentChoice(state: GameState, playerId: PlayerId): GameAction
}
