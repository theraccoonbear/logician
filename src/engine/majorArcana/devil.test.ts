import { describe, expect, it } from 'vitest'
import { resolveDevil } from './devil'
import { TEST_PRNG } from '../testHelpers'
import type { Hex } from '../board'
import { LEVEL_BOUNDS } from '../types/structure'
import type { GameState, Player } from '../types/state'
import type { Structure } from '../types/structure'
import type { MajorArcanaCard } from '../types/tarot'

function makePlayer(id: string, name: string): Player {
  return { id, name, isAI: false, logicHand: [], effectHand: [], heldMajorArcana: [] }
}

function makeState(overrides: Partial<GameState>): GameState {
  const board: Hex[] = Array.from({ length: 10 }, (_, i) => ({ id: `hex-${i + 1}`, terrain: 'Forests' as const }))
  return {
    players: [makePlayer('p1', 'Alice'), makePlayer('p2', 'Bob')],
    activePlayerIndex: 0,
    phase: 'cast',
    board,
    structures: [],
    tarotRow: [],
    tarotDeck: [],
    tarotDiscard: [],
    logicDeck: [],
    logicDiscard: [],
    effectDeck: [],
    effectDiscard: [],
    log: [],
    prng: TEST_PRNG,
    ...overrides,
  }
}

function structure(overrides: Partial<Structure> & Pick<Structure, 'id' | 'type'>): Structure {
  return { owner: 'p2', hexId: 'hex-1', level: LEVEL_BOUNDS[overrides.type].floor, fortressed: false, ...overrides }
}

const tarot: MajorArcanaCard = { kind: 'major', instanceId: 'devil-1', id: 'DEVIL' }

describe('resolveDevil', () => {
  it('requires two different-category conditions and a valid logic card in hand', () => {
    const state = makeState({
      tarotRow: [tarot],
      players: [{ ...makePlayer('p1', 'Alice'), logicHand: [{ instanceId: 'l1', kind: 'A' }] }, makePlayer('p2', 'Bob')],
    })
    const sameCategory = resolveDevil(state, 'p1', tarot, {
      condition1: { kind: 'terrain', value: 'Forests' },
      condition2: { kind: 'terrain', value: 'Swamps' },
      logicCardId: 'l1',
    })
    expect(sameCategory.ok).toBe(false)

    const missingCard = resolveDevil(state, 'p1', tarot, {
      condition1: { kind: 'terrain', value: 'Forests' },
      condition2: { kind: 'level', value: 2 },
      logicCardId: 'not-in-hand',
    })
    expect(missingCard.ok).toBe(false)
  })

  it('destroys matched structures (bypassing no immunity), consumes only the logic card, and discards/refills the tarot', () => {
    const doomed = structure({ id: 'doomed', type: 'Tower', level: 2, hexId: 'hex-1', owner: 'p2' })
    const safe = structure({ id: 'safe', type: 'Tower', level: 5, hexId: 'hex-1', owner: 'p2' })
    const fortressedTarget = structure({ id: 'fort', type: 'Pyramid', level: 2, hexId: 'hex-1', owner: 'p2', fortressed: true })
    const state = makeState({
      structures: [doomed, safe, fortressedTarget],
      tarotRow: [tarot],
      players: [
        { ...makePlayer('p1', 'Alice'), logicHand: [{ instanceId: 'l1', kind: 'A_AND_B' }], effectHand: [{ instanceId: 'e1', kind: 'UPGRADE_1' }] },
        makePlayer('p2', 'Bob'),
      ],
    })
    const result = resolveDevil(state, 'p1', tarot, {
      condition1: { kind: 'terrain', value: 'Forests' },
      condition2: { kind: 'level', value: 2 },
      logicCardId: 'l1',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.structures.map((s) => s.id).sort()).toEqual(['fort', 'safe'])
    // Logic card spent and redrawn; Effect card untouched since Devil never uses one.
    expect(result.state.players[0].logicHand.some((c) => c.instanceId === 'l1')).toBe(false)
    expect(result.state.players[0].effectHand.some((c) => c.instanceId === 'e1')).toBe(true)
    expect(result.state.tarotRow.some((t) => t.instanceId === 'devil-1')).toBe(false)
  })
})
