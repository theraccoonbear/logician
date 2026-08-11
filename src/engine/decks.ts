import { EFFECT_CARD_COPIES, LOGIC_CARD_COPIES, LOGIC_CARD_IDS, type EffectCard, type LogicCard } from './types/cards'
import { MAJOR_ARCANA_IDS, MINOR_RANKS, deriveMinorOperands, type TarotCard } from './types/tarot'

const SUITS = ['Swords', 'Wands', 'Cups', 'Pentacles'] as const

/** Pure Fisher-Yates shuffle — returns a new array, never mutates the input. */
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function createLogicDeck(): LogicCard[] {
  const cards: LogicCard[] = []
  for (const kind of LOGIC_CARD_IDS) {
    for (let i = 0; i < LOGIC_CARD_COPIES; i += 1) {
      cards.push({ instanceId: crypto.randomUUID(), kind })
    }
  }
  return shuffle(cards)
}

export function createEffectDeck(): EffectCard[] {
  const cards: EffectCard[] = []
  for (const [kind, copies] of Object.entries(EFFECT_CARD_COPIES)) {
    for (let i = 0; i < copies; i += 1) {
      cards.push({ instanceId: crypto.randomUUID(), kind: kind as EffectCard['kind'] })
    }
  }
  return shuffle(cards)
}

export function createTarotDeck(): TarotCard[] {
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
  return shuffle(cards)
}

export interface DrawResult<T> {
  drawn: T[]
  remaining: T[]
}

/** Draws up to `count` cards, pulling from `discard` (reshuffled) if `deck` runs out. */
export function drawCards<T>(deck: readonly T[], discard: readonly T[], count: number): DrawResult<T> & { remainingDiscard: T[] } {
  let pool = [...deck]
  let discardPool = [...discard]

  if (pool.length < count && discardPool.length > 0) {
    pool = [...pool, ...shuffle(discardPool)]
    discardPool = []
  }

  const drawn = pool.slice(0, count)
  const remaining = pool.slice(count)
  return { drawn, remaining, remainingDiscard: discardPool }
}
