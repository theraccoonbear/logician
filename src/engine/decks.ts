import { EFFECT_CARD_COPIES, LOGIC_CARD_COPIES, LOGIC_CARD_IDS, type EffectCard, type LogicCard } from './types/cards'
import { MAJOR_ARCANA_IDS, MINOR_RANKS, deriveMinorOperands, type TarotCard } from './types/tarot'
import { nextRandom, type PRNGState } from './prng'

const SUITS = ['Swords', 'Wands', 'Cups', 'Pentacles'] as const

/** Pure Fisher-Yates shuffle — returns a new array, never mutates the input. */
export function shuffle<T>(items: readonly T[], prng: PRNGState): { result: T[]; prng: PRNGState } {
  const result = [...items]
  let currentPrng = prng
  for (let i = result.length - 1; i > 0; i -= 1) {
    const { value, prng: nextPrng } = nextRandom(currentPrng)
    const j = Math.floor(value * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
    currentPrng = nextPrng
  }
  return { result, prng: currentPrng }
}

export function createLogicDeck(prng: PRNGState): { deck: LogicCard[]; prng: PRNGState } {
  const cards: LogicCard[] = []
  for (const kind of LOGIC_CARD_IDS) {
    for (let i = 0; i < LOGIC_CARD_COPIES; i += 1) {
      cards.push({ instanceId: crypto.randomUUID(), kind })
    }
  }
  const { result, prng: nextPrng } = shuffle(cards, prng)
  return { deck: result, prng: nextPrng }
}

export function createEffectDeck(prng: PRNGState): { deck: EffectCard[]; prng: PRNGState } {
  const cards: EffectCard[] = []
  for (const [kind, copies] of Object.entries(EFFECT_CARD_COPIES)) {
    for (let i = 0; i < copies; i += 1) {
      cards.push({ instanceId: crypto.randomUUID(), kind: kind as EffectCard['kind'] })
    }
  }
  const { result, prng: nextPrng } = shuffle(cards, prng)
  return { deck: result, prng: nextPrng }
}

export function createTarotDeck(prng: PRNGState): { deck: TarotCard[]; prng: PRNGState } {
  const cards: TarotCard[] = []
  for (const suit of SUITS) {
    for (const rank of MINOR_RANKS) {
      const { operandA, operandB } = deriveMinorOperands(suit, rank)
      cards.push({ kind: 'minor', instanceId: crypto.randomUUID(), suit, rank, operandA, operandB })
    }
  }
  for (const id of MAJOR_ARCANA_IDS) {
    cards.push({ kind: 'major', instanceId: crypto.randomUUID(), id })
  }
  const { result, prng: nextPrng } = shuffle(cards, prng)
  return { deck: result, prng: nextPrng }
}

export interface DrawResult<T> {
  drawn: T[]
  remaining: T[]
}

/** Draws up to `count` cards, pulling from `discard` (reshuffled) if `deck` runs out. */
export function drawCards<T>(deck: readonly T[], discard: readonly T[], count: number, prng: PRNGState): DrawResult<T> & { remainingDiscard: T[]; prng: PRNGState } {
  let pool = [...deck]
  let discardPool = [...discard]
  let currentPrng = prng

  if (pool.length < count && discardPool.length > 0) {
    const { result: shuffledDiscard, prng: afterShuffle } = shuffle(discardPool, currentPrng)
    pool = [...pool, ...shuffledDiscard]
    discardPool = []
    currentPrng = afterShuffle
  }

  const drawn = pool.slice(0, count)
  const remaining = pool.slice(count)
  return { drawn, remaining, remainingDiscard: discardPool, prng: currentPrng }
}
