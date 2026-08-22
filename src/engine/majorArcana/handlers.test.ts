import { describe, expect, it } from 'vitest'
import { resolveChariot, resolveDeath, resolveHermit, resolveJudgement, resolveWheel } from './handlers'
import { TEST_PRNG } from '../testHelpers'
import type { Hex } from '../board'
import { LEVEL_BOUNDS } from '../types/structure'
import type { GameState } from '../types/state'
import type { Structure } from '../types/structure'
import type { MajorArcanaCard, TarotCard } from '../types/tarot'

function makeState(overrides: Partial<GameState>): GameState {
  const board: Hex[] = Array.from({ length: 10 }, (_, i) => ({ id: `hex-${i + 1}`, terrain: 'Forests' as const }))
  return {
    players: [
      { id: 'p1', name: 'Alice', isAI: false, logicHand: [], effectHand: [], heldMajorArcana: [] },
      { id: 'p2', name: 'Bob', isAI: false, logicHand: [], effectHand: [], heldMajorArcana: [] },
    ],
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

function majorCard(id: MajorArcanaCard['id'], instanceId = `major-${id}`): MajorArcanaCard {
  return { kind: 'major', instanceId, id }
}

function structure(overrides: Partial<Structure> & Pick<Structure, 'id' | 'type'>): Structure {
  return { owner: 'p1', hexId: 'hex-1', level: LEVEL_BOUNDS[overrides.type].floor, fortressed: false, ...overrides }
}

describe('Wheel of Fortune', () => {
  const tarot = majorCard('WHEEL')
  const s1 = structure({ id: 's1', type: 'Tower', level: 6 })
  const s2 = structure({ id: 's2', type: 'Pyramid', level: 4 })
  const s3 = structure({ id: 's3', type: 'Pool', level: 2 })
  const fortressed = structure({ id: 's4', type: 'Tower', level: 3, fortressed: true })

  it('requires exactly 3 distinct targets', () => {
    const state = makeState({ structures: [s1, s2, s3], tarotRow: [tarot] })
    expect(resolveWheel(state, 'p1', tarot, { structureIds: ['s1', 's2'] })).toEqual({ ok: false, error: expect.any(String) })
    expect(resolveWheel(state, 'p1', tarot, { structureIds: ['s1', 's1', 's2'] })).toEqual({ ok: false, error: expect.any(String) })
  })

  it('rejects targeting a nonexistent or fortressed structure', () => {
    const state = makeState({ structures: [s1, s2, s3, fortressed], tarotRow: [tarot] })
    expect(resolveWheel(state, 'p1', tarot, { structureIds: ['s1', 's2', 'ghost'] }).ok).toBe(false)
    expect(resolveWheel(state, 'p1', tarot, { structureIds: ['s1', 's2', 's4'] }).ok).toBe(false)
  })

  it('randomizes all 3 targets within bounds and discards/refills the tarot', () => {
    const replacement: TarotCard = majorCard('STAR', 'replacement')
    const state = makeState({ structures: [s1, s2, s3], tarotRow: [tarot], tarotDeck: [replacement] })
    const result = resolveWheel(state, 'p1', tarot, { structureIds: ['s1', 's2', 's3'] })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    for (const id of ['s1', 's2', 's3']) {
      const s = result.state.structures.find((x) => x.id === id)!
      const bounds = LEVEL_BOUNDS[s.type]
      expect(s.level).toBeGreaterThanOrEqual(bounds.floor)
      expect(s.level).toBeLessThanOrEqual(bounds.max)
    }
    expect(result.state.tarotRow).toEqual([replacement])
    expect(result.state.tarotDiscard).toEqual([tarot])
  })
})

describe('The Hermit', () => {
  const tarot = majorCard('HERMIT')
  const other1 = majorCard('STAR', 'row-2')
  const other2 = majorCard('SUN', 'row-3')
  const deckCard1 = majorCard('MOON', 'deck-1')
  const deckCard2 = majorCard('DEVIL', 'deck-2')
  const deckCard3 = majorCard('TOWER', 'deck-3')

  it('requires exactly 3 distinct cards that exist in the deck', () => {
    const state = makeState({ tarotRow: [tarot, other1, other2], tarotDeck: [deckCard1, deckCard2, deckCard3] })
    expect(resolveHermit(state, 'p1', tarot, { chosenTarotIds: ['deck-1', 'deck-2'] }).ok).toBe(false)
    expect(resolveHermit(state, 'p1', tarot, { chosenTarotIds: ['deck-1', 'deck-2', 'not-in-deck'] }).ok).toBe(false)
  })

  it('discards the whole old row and installs the 3 searched-for cards', () => {
    const state = makeState({ tarotRow: [tarot, other1, other2], tarotDeck: [deckCard1, deckCard2, deckCard3] })
    const result = resolveHermit(state, 'p1', tarot, { chosenTarotIds: ['deck-1', 'deck-2', 'deck-3'] })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.tarotRow.map((t) => t.instanceId).sort()).toEqual(['deck-1', 'deck-2', 'deck-3'])
    expect(result.state.tarotDiscard.map((t) => t.instanceId).sort()).toEqual(['major-HERMIT', 'row-2', 'row-3'])
    expect(result.state.tarotDeck).toHaveLength(0)
  })
})

describe('The Chariot', () => {
  const tarot = majorCard('CHARIOT')
  const a = structure({ id: 'a', type: 'Tower', hexId: 'hex-1', level: 4 })
  const b = structure({ id: 'b', type: 'Pyramid', hexId: 'hex-1', level: 2, owner: 'p2' })

  it('rejects an empty hex, a fortified hex, or a mismatched/unbalanced redistribution', () => {
    const state = makeState({ structures: [a, b], tarotRow: [tarot] })
    expect(resolveChariot(state, 'p1', tarot, { hexId: 'hex-9', newLevels: {} }).ok).toBe(false)

    const fortifiedState = makeState({ structures: [{ ...a, fortressed: true }, b], tarotRow: [tarot] })
    expect(resolveChariot(fortifiedState, 'p1', tarot, { hexId: 'hex-1', newLevels: { a: 4, b: 2 } }).ok).toBe(false)

    expect(resolveChariot(state, 'p1', tarot, { hexId: 'hex-1', newLevels: { a: 4 } }).ok).toBe(false) // missing b
    expect(resolveChariot(state, 'p1', tarot, { hexId: 'hex-1', newLevels: { a: 5, b: 2 } }).ok).toBe(false) // unbalanced (total 6 -> 7)
    expect(resolveChariot(state, 'p1', tarot, { hexId: 'hex-1', newLevels: { a: 7, b: -1 } }).ok).toBe(false) // out of bounds
  })

  it('redistributes levels while conserving the total and respecting per-type bounds', () => {
    const state = makeState({ structures: [a, b], tarotRow: [tarot] })
    const result = resolveChariot(state, 'p1', tarot, { hexId: 'hex-1', newLevels: { a: 3, b: 3 } })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.structures.find((s) => s.id === 'a')!.level).toBe(3)
    expect(result.state.structures.find((s) => s.id === 'b')!.level).toBe(3)
    // ownership and type are untouched by the redistribution
    expect(result.state.structures.find((s) => s.id === 'b')!.owner).toBe('p2')
  })
})

describe('Death', () => {
  const tarot = majorCard('DEATH')

  it('destroys everything at level <= 2 across all owners, but Fortresses always survive', () => {
    const low1 = structure({ id: 'low1', type: 'Pyramid', level: 2, owner: 'p1' })
    const low2 = structure({ id: 'low2', type: 'Tower', level: 1, owner: 'p2', fortressed: true }) // fortressed, but Death bypasses
    const high = structure({ id: 'high', type: 'Tower', level: 3, owner: 'p1' })
    const weakFortress = structure({ id: 'fort', type: 'Fortress', level: 1, owner: 'p2' })
    const state = makeState({ structures: [low1, low2, high, weakFortress], tarotRow: [tarot] })

    const result = resolveDeath(state, 'p1', tarot)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const ids = result.state.structures.map((s) => s.id).sort()
    expect(ids).toEqual(['fort', 'high'])
  })
})

describe('Judgement', () => {
  const tarot = majorCard('JUDGEMENT')

  it('resets every structure to its floor, including Fortresses and fortressed basics, without destroying anything', () => {
    const pool = structure({ id: 'pool', type: 'Pool', level: 2, fortressed: true })
    const tower = structure({ id: 'tower', type: 'Tower', level: 6, fortressed: true })
    const fortress = structure({ id: 'fort', type: 'Fortress', level: 2 })
    const state = makeState({ structures: [pool, tower, fortress], tarotRow: [tarot] })

    const result = resolveJudgement(state, 'p1', tarot)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.structures).toHaveLength(3)
    expect(result.state.structures.find((s) => s.id === 'pool')!.level).toBe(2)
    expect(result.state.structures.find((s) => s.id === 'tower')!.level).toBe(1)
    expect(result.state.structures.find((s) => s.id === 'fort')!.level).toBe(1)
    // fortressed flag itself is untouched — only levels are minimized
    expect(result.state.structures.find((s) => s.id === 'pool')!.fortressed).toBe(true)
  })
})
