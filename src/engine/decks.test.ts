import { describe, expect, it } from 'vitest'
import { createEffectDeck, createLogicDeck, createTarotDeck, drawCards } from './decks'
import { TEST_PRNG } from './testHelpers'
import { EFFECT_CARD_COPIES, LOGIC_CARD_COPIES, LOGIC_CARD_IDS } from './types/cards'
import { MAJOR_ARCANA_IDS, MINOR_RANKS } from './types/tarot'

describe('createLogicDeck', () => {
  it('contains the expected copy count of every Logic Card kind', () => {
    const { deck } = createLogicDeck(TEST_PRNG)
    expect(deck).toHaveLength(LOGIC_CARD_IDS.length * LOGIC_CARD_COPIES)
    for (const kind of LOGIC_CARD_IDS) {
      expect(deck.filter((c) => c.kind === kind)).toHaveLength(LOGIC_CARD_COPIES)
    }
  })

  it('gives every card a unique instance id', () => {
    const { deck } = createLogicDeck(TEST_PRNG)
    expect(new Set(deck.map((c) => c.instanceId)).size).toBe(deck.length)
  })
})

describe('createEffectDeck', () => {
  it('contains the expected copy count of every Effect Card kind', () => {
    const { deck } = createEffectDeck(TEST_PRNG)
    for (const [kind, copies] of Object.entries(EFFECT_CARD_COPIES)) {
      expect(deck.filter((c) => c.kind === kind)).toHaveLength(copies)
    }
  })
})

describe('createTarotDeck', () => {
  it('contains all 4 suits x 14 minor ranks plus all 22 major arcana', () => {
    const { deck } = createTarotDeck(TEST_PRNG)
    expect(deck.filter((c) => c.kind === 'minor')).toHaveLength(4 * MINOR_RANKS.length)
    expect(deck.filter((c) => c.kind === 'major')).toHaveLength(MAJOR_ARCANA_IDS.length)
  })
})

describe('drawCards', () => {
  it('draws from the deck when enough cards remain', () => {
    const deck = ['a', 'b', 'c', 'd']
    const { drawn, remaining, remainingDiscard } = drawCards(deck, [], 2, TEST_PRNG)
    expect(drawn).toEqual(['a', 'b'])
    expect(remaining).toEqual(['c', 'd'])
    expect(remainingDiscard).toEqual([])
  })

  it('reshuffles the discard into the deck when the deck runs out', () => {
    const deck = ['a']
    const discard = ['b', 'c', 'd']
    const { drawn, remaining, remainingDiscard } = drawCards(deck, discard, 3, TEST_PRNG)
    expect(drawn).toHaveLength(3)
    // all four original cards end up split across drawn+remaining, discard is emptied
    expect([...drawn, ...remaining].sort()).toEqual(['a', 'b', 'c', 'd'])
    expect(remainingDiscard).toEqual([])
  })

  it('never mutates the input deck or discard arrays', () => {
    const deck = ['a', 'b']
    const discard = ['c']
    drawCards(deck, discard, 5, TEST_PRNG)
    expect(deck).toEqual(['a', 'b'])
    expect(discard).toEqual(['c'])
  })
})
