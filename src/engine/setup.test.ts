import { describe, expect, it } from 'vitest'
import { createInitialGameState } from './setup'
import { EFFECT_CARD_COPIES, HAND_SIZE, LOGIC_CARD_COPIES, LOGIC_CARD_IDS } from './types/cards'
import { MAJOR_ARCANA_IDS, MINOR_RANKS } from './types/tarot'

const TOTAL_LOGIC_CARDS = LOGIC_CARD_IDS.length * LOGIC_CARD_COPIES
const TOTAL_EFFECT_CARDS = Object.values(EFFECT_CARD_COPIES).reduce((sum, n) => sum + n, 0)
const TOTAL_TAROT_CARDS = 4 * MINOR_RANKS.length + MAJOR_ARCANA_IDS.length

describe('createInitialGameState', () => {
  const state = createInitialGameState([
    { name: 'Alice', isAI: false },
    { name: 'Bob', isAI: true },
  ])

  it('creates a 10-hex board with the confirmed terrain split', () => {
    expect(state.board).toHaveLength(10)
    const counts = state.board.reduce<Record<string, number>>((acc, hex) => {
      acc[hex.terrain] = (acc[hex.terrain] ?? 0) + 1
      return acc
    }, {})
    expect(counts).toEqual({ Prairies: 2, Mountains: 3, Forests: 3, Swamps: 2 })
  })

  it('starts in the setup phase with no structures on the board', () => {
    expect(state.phase).toBe('setup')
    expect(state.structures).toHaveLength(0)
  })

  it('deals each player a hand of 3 Logic and 3 Effect cards, no held major arcana', () => {
    expect(state.players).toHaveLength(2)
    for (const player of state.players) {
      expect(player.logicHand).toHaveLength(HAND_SIZE)
      expect(player.effectHand).toHaveLength(HAND_SIZE)
      expect(player.heldMajorArcana).toHaveLength(0)
    }
    expect(state.players[0].isAI).toBe(false)
    expect(state.players[1].isAI).toBe(true)
  })

  it('correctly sets and carries over assistance level configurations', () => {
    expect(state.players[0].assistanceLevel).toBe('none')
    expect(state.players[1].assistanceLevel).toBeUndefined()

    const customState = createInitialGameState([
      { name: 'Alice', isAI: false, assistanceLevel: 'some' },
      { name: 'Bob', isAI: true, assistanceLevel: 'full' },
    ])
    expect(customState.players[0].assistanceLevel).toBe('some')
    expect(customState.players[1].assistanceLevel).toBeUndefined()
  })

  it('deals a 3-card face-up tarot row', () => {
    expect(state.tarotRow).toHaveLength(3)
  })

  it('leaves the remaining decks at the expected sizes after setup deals', () => {
    expect(state.logicDeck).toHaveLength(TOTAL_LOGIC_CARDS - 2 * HAND_SIZE)
    expect(state.effectDeck).toHaveLength(TOTAL_EFFECT_CARDS - 2 * HAND_SIZE)
    expect(state.tarotDeck).toHaveLength(TOTAL_TAROT_CARDS - 3)
  })

  it('throws if fewer than 2 players are configured', () => {
    expect(() => createInitialGameState([{ name: 'Solo', isAI: false }])).toThrow()
  })
})
