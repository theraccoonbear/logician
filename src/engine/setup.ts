import { createBoard } from './board'
import { createEffectDeck, createLogicDeck, createTarotDeck, drawCards } from './decks'
import { HAND_SIZE } from './types/cards'
import type { AIDifficulty, AssistanceLevel, GameState, Player } from './types/state'

export interface PlayerConfig {
  name: string
  isAI: boolean
  aiDifficulty?: AIDifficulty
  assistanceLevel?: AssistanceLevel
}

/**
 * Builds a fresh GameState: board dealt, tarot/logic/effect decks shuffled,
 * starting hands and tarot row dealt. Structures start empty — phase 'setup'
 * means each player still needs to place their initial Pool+Pyramid+Tower via
 * the normal BUILD_STRUCTURE action before real turns begin (see reducer.ts).
 */
export function createInitialGameState(playerConfigs: PlayerConfig[]): GameState {
  if (playerConfigs.length < 2) {
    throw new Error('Logician requires at least 2 players')
  }

  let logicDeck = createLogicDeck()
  let effectDeck = createEffectDeck()
  let tarotDeck = createTarotDeck()

  const players: Player[] = playerConfigs.map((config, index) => {
    const logicDraw = drawCards(logicDeck, [], HAND_SIZE)
    logicDeck = logicDraw.remaining
    const effectDraw = drawCards(effectDeck, [], HAND_SIZE)
    effectDeck = effectDraw.remaining

    return {
      id: `player-${index + 1}`,
      name: config.name,
      isAI: config.isAI,
      aiDifficulty: config.isAI ? (config.aiDifficulty ?? 'heuristic') : undefined,
      assistanceLevel: config.isAI ? undefined : (config.assistanceLevel ?? 'none'),
      logicHand: logicDraw.drawn,
      effectHand: effectDraw.drawn,
      heldMajorArcana: [],
    }
  })

  const tarotRowDraw = drawCards(tarotDeck, [], 3)
  tarotDeck = tarotRowDraw.remaining

  return {
    players,
    activePlayerIndex: 0,
    phase: 'setup',
    board: createBoard(),
    structures: [],
    tarotRow: tarotRowDraw.drawn,
    tarotDeck,
    tarotDiscard: [],
    logicDeck,
    logicDiscard: [],
    effectDeck,
    effectDiscard: [],
    log: [],
  }
}
