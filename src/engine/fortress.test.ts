import { describe, expect, it } from 'vitest'
import { getAffectedStructures } from './selectors'
import { TEST_PRNG } from './testHelpers'
import type { Hex } from './board'
import type { GameState } from './types/state'
import type { Structure } from './types/structure'

function makeState(structures: Structure[], board: Hex[]): GameState {
  return {
    players: [],
    activePlayerIndex: 0,
    phase: 'cast',
    board,
    structures,
    tarotRow: [],
    tarotDeck: [],
    tarotDiscard: [],
    logicDeck: [],
    logicDiscard: [],
    effectDeck: [],
    effectDiscard: [],
    log: [],
    prng: TEST_PRNG,
  }
}

describe('fortress immunity', () => {
  const board: Hex[] = [{ id: 'hex-1', terrain: 'Forests' }]
  const fortressedPool: Structure = {
    id: 'pool-1',
    type: 'Pool',
    owner: 'p1',
    hexId: 'hex-1',
    level: 3,
    fortressed: true,
  }
  const openPyramid: Structure = {
    id: 'pyr-1',
    type: 'Pyramid',
    owner: 'p1',
    hexId: 'hex-1',
    level: 2,
    fortressed: false,
  }
  const state = makeState([fortressedPool, openPyramid], board)

  const query = { logicCardId: 'A' as const, operandA: { kind: 'terrain' as const, value: 'Forests' as const }, operandB: { kind: 'terrain' as const, value: 'Forests' as const } }

  it('excludes fortressed structures from normal targeting even when they match', () => {
    const affected = getAffectedStructures(state, query)
    expect(affected.map((s) => s.id)).toEqual(['pyr-1'])
  })

  it('includes fortressed structures only when bypassFortress is set', () => {
    const affected = getAffectedStructures(state, query, { bypassFortress: true })
    expect(affected.map((s) => s.id).sort()).toEqual(['pool-1', 'pyr-1'])
  })
})
