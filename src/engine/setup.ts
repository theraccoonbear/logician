import { createBoard } from './board'
import { createEffectDeck, createLogicDeck, createTarotDeck, drawCards } from './decks'
import { createPRNG, generateSeed } from './prng'
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
export function createInitialGameState(playerConfigs: PlayerConfig[], seed?: number): GameState {
  if (playerConfigs.length < 2) {
    throw new Error('Logician requires at least 2 players')
  }

  const actualSeed = seed ?? generateSeed()
  let prng = createPRNG(actualSeed)

  let logicDeckResult = createLogicDeck(prng)
  let logicDeck = logicDeckResult.deck
  prng = logicDeckResult.prng

  let effectDeckResult = createEffectDeck(prng)
  let effectDeck = effectDeckResult.deck
  prng = effectDeckResult.prng

  let tarotDeckResult = createTarotDeck(prng)
  let tarotDeck = tarotDeckResult.deck
  prng = tarotDeckResult.prng

  const players: Player[] = playerConfigs.map((config, index) => {
    const logicDraw = drawCards(logicDeck, [], HAND_SIZE, prng)
    logicDeck = logicDraw.remaining
    prng = logicDraw.prng

    const effectDraw = drawCards(effectDeck, [], HAND_SIZE, prng)
    effectDeck = effectDraw.remaining
    prng = effectDraw.prng

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

  const tarotRowDraw = drawCards(tarotDeck, [], 3, prng)
  tarotDeck = tarotRowDraw.remaining
  prng = tarotRowDraw.prng

  const initMessage = `GAME_INIT SEED:${actualSeed}: ` + players.map((p, index) => {
    return `p:${index + 1} = ${p.name} (${p.isAI ? `AI: ${p.aiDifficulty}` : `Human, Assist: ${p.assistanceLevel ?? 'none'}`})`
  }).join(', ')

  const tarotRowMessage = `TAROT_ROW ${tarotRowDraw.drawn.map((c) => {
    if (c.kind === 'minor') return `t:${c.rank}_OF_${c.suit.toUpperCase()}`
    return `t:${c.id}`
  }).join(', ')}`

  const handLogs = players.map((p, index) => {
    const logicKinds = p.logicHand.map((c) => `l:${c.kind}`).join(', ')
    const effectKinds = p.effectHand.map((c) => `e:${c.kind}`).join(', ')
    return `p:${index + 1} HAND ${logicKinds} + ${effectKinds}`
  })

  const initialLog = [
    { message: initMessage },
    { message: tarotRowMessage },
    ...handLogs.map((msg) => ({ message: msg }))
  ]

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
    log: initialLog,
    prng,
  }
}
