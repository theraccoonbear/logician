import { describe, expect, it } from 'vitest'
import { designatedOpponentId, resolveForcedOperandSpell } from './forcedOperand'
import type { Hex } from '../board'
import { TEST_PRNG } from '../testHelpers'
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
  return { owner: 'p1', hexId: 'hex-1', level: LEVEL_BOUNDS[overrides.type].floor, fortressed: false, ...overrides }
}

describe('designatedOpponentId', () => {
  it('resolves clockwise/counterclockwise around N players', () => {
    const state = makeState({ players: [makePlayer('a', 'A'), makePlayer('b', 'B'), makePlayer('c', 'C')] })
    expect(designatedOpponentId(state, 'a', 'clockwise')).toBe('b')
    expect(designatedOpponentId(state, 'a', 'counterclockwise')).toBe('c')
    expect(designatedOpponentId(state, 'c', 'clockwise')).toBe('a')
  })

  it('collapses to the lone opponent in a 2-player game either direction', () => {
    const state = makeState({})
    expect(designatedOpponentId(state, 'p1', 'clockwise')).toBe('p2')
    expect(designatedOpponentId(state, 'p1', 'counterclockwise')).toBe('p2')
  })
})

describe('resolveForcedOperandSpell', () => {
  const tarot: MajorArcanaCard = { kind: 'major', instanceId: 'lovers-1', id: 'LOVERS' }

  it('rejects a non-forced-operand major', () => {
    const badTarot: MajorArcanaCard = { kind: 'major', instanceId: 'death-1', id: 'DEATH' }
    const state = makeState({})
    const result = resolveForcedOperandSpell(state, 'p1', badTarot, {
      casterValue: 3,
      opponentValue: 'Forests',
      logicCardId: 'l1',
      effectCardId: 'e1',
    })
    expect(result.ok).toBe(false)
  })

  it('rejects an out-of-range level or unknown terrain/structure value', () => {
    const state = makeState({ tarotRow: [tarot], players: [{ ...makePlayer('p1', 'Alice'), logicHand: [{ instanceId: 'l1', kind: 'A' }], effectHand: [{ instanceId: 'e1', kind: 'UPGRADE_1' }] }, makePlayer('p2', 'Bob')] })
    expect(resolveForcedOperandSpell(state, 'p1', tarot, { casterValue: 7, opponentValue: 'Forests', logicCardId: 'l1', effectCardId: 'e1' }).ok).toBe(false)
    expect(
      resolveForcedOperandSpell(state, 'p1', tarot, { casterValue: 3, opponentValue: 'Atlantis' as never, logicCardId: 'l1', effectCardId: 'e1' }).ok,
    ).toBe(false)
  })

  it('resolves LOVERS (caster names level, opponent names terrain) as a normal spell', () => {
    const target: Structure = structure({ id: 't1', type: 'Tower', hexId: 'hex-1', level: 3, owner: 'p2' })
    const other: Structure = structure({ id: 't2', type: 'Tower', hexId: 'hex-2', level: 3, owner: 'p2' })
    const state = makeState({
      structures: [target, other],
      tarotRow: [tarot],
      players: [
        { ...makePlayer('p1', 'Alice'), logicHand: [{ instanceId: 'l1', kind: 'A_AND_B' }], effectHand: [{ instanceId: 'e1', kind: 'UPGRADE_1' }] },
        makePlayer('p2', 'Bob'),
      ],
    })
    // caster names level 3, opponent names Forests -> A_AND_B matches structures at level 3 on a Forests hex.
    const result = resolveForcedOperandSpell(state, 'p1', tarot, {
      casterValue: 3,
      opponentValue: 'Forests',
      logicCardId: 'l1',
      effectCardId: 'e1',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.structures.find((s) => s.id === 't1')!.level).toBe(4)
    expect(result.state.structures.find((s) => s.id === 't2')!.level).toBe(4)
    expect(result.state.tarotRow.some((t) => t.instanceId === 'lovers-1')).toBe(false)
  })
})
