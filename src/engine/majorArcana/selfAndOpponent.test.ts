import { describe, expect, it } from 'vitest'
import { resolveStrength, resolveTower } from './selfAndOpponent'
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
  return { owner: 'p1', hexId: 'hex-1', level: LEVEL_BOUNDS[overrides.type].floor, fortressed: false, ...overrides }
}

describe('resolveTower', () => {
  const tarot: MajorArcanaCard = { kind: 'major', instanceId: 'tower-1', id: 'TOWER' }

  it('rejects a foreign own-target, an own-owned opponent target, a fortressed target, or a mismatched sum', () => {
    const mine = structure({ id: 'mine', type: 'Tower', owner: 'p1', level: 4 })
    const theirsA = structure({ id: 'theirsA', type: 'Pyramid', owner: 'p2', level: 2 })
    const theirsB = structure({ id: 'theirsB', type: 'Pool', owner: 'p2', level: 2, fortressed: true })
    const state = makeState({ structures: [mine, theirsA, theirsB], tarotRow: [tarot] })

    expect(resolveTower(state, 'p1', tarot, { ownStructureId: 'theirsA', opponentStructureIds: ['mine'] }).ok).toBe(false)
    expect(resolveTower(state, 'p1', tarot, { ownStructureId: 'mine', opponentStructureIds: ['theirsB', 'theirsA'] }).ok).toBe(false) // fortressed
    expect(resolveTower(state, 'p1', tarot, { ownStructureId: 'mine', opponentStructureIds: ['theirsA'] }).ok).toBe(false) // sum 2 != 4
  })

  it('destroys the own structure plus opponent structures totaling exactly its level', () => {
    const mine = structure({ id: 'mine', type: 'Tower', owner: 'p1', level: 4 })
    const a = structure({ id: 'a', type: 'Pyramid', owner: 'p2', level: 2 })
    const b = structure({ id: 'b', type: 'Pool', owner: 'p2', level: 2 })
    const untouched = structure({ id: 'c', type: 'Tower', owner: 'p2', level: 6 })
    const state = makeState({ structures: [mine, a, b, untouched], tarotRow: [tarot] })
    const result = resolveTower(state, 'p1', tarot, { ownStructureId: 'mine', opponentStructureIds: ['a', 'b'] })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.structures.map((s) => s.id)).toEqual(['c'])
  })
})

describe('resolveStrength', () => {
  const tarot: MajorArcanaCard = { kind: 'major', instanceId: 'strength-1', id: 'STRENGTH' }

  it('downgrades your own structure and every unfortified opponent structure of the same type, but leaves fortressed ones and other types alone', () => {
    const mine = structure({ id: 'mine', type: 'Tower', owner: 'p1', level: 3 })
    const sameType = structure({ id: 'same', type: 'Tower', owner: 'p2', level: 2 })
    const sameTypeFortressed = structure({ id: 'sameF', type: 'Tower', owner: 'p2', level: 2, fortressed: true })
    const differentType = structure({ id: 'diff', type: 'Pyramid', owner: 'p2', level: 2 })
    const state = makeState({ structures: [mine, sameType, sameTypeFortressed, differentType], tarotRow: [tarot] })

    const result = resolveStrength(state, 'p1', tarot, { ownStructureId: 'mine' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.structures.find((s) => s.id === 'mine')!.level).toBe(2)
    expect(result.state.structures.find((s) => s.id === 'same')!.level).toBe(1) // Tower floor is 1, so it survives at 1
    expect(result.state.structures.find((s) => s.id === 'sameF')!.level).toBe(2) // fortressed, untouched
    expect(result.state.structures.find((s) => s.id === 'diff')!.level).toBe(2) // different type, untouched
  })

  it('rejects targeting a fortressed or foreign structure as your own', () => {
    const foreign = structure({ id: 'foreign', type: 'Tower', owner: 'p2', level: 3 })
    const state = makeState({ structures: [foreign], tarotRow: [tarot] })
    expect(resolveStrength(state, 'p1', tarot, { ownStructureId: 'foreign' }).ok).toBe(false)
  })
})
