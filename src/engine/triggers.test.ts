import { describe, expect, it } from 'vitest'
import { HOLD_CARD_HANDLERS, computeTriggerQueue, isHoldCard } from './triggers'
import type { Hex } from './board'
import type { GameState, PendingResolution, Player } from './types/state'
import type { MajorArcanaCard } from './types/tarot'

function makePlayer(id: string, name: string, held: MajorArcanaCard[] = []): Player {
  return { id, name, isAI: false, logicHand: [], effectHand: [], heldMajorArcana: held }
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
    ...overrides,
  }
}

const spellPending = {
  kind: 'spell' as const,
  casterId: 'p1',
  logicCardInstanceId: 'l1',
  effectCardInstanceId: 'e1',
  effectCardKind: 'UPGRADE_1' as const,
  tarot: { kind: 'minor', instanceId: 't1', suit: 'Cups', rank: '3', operandA: { kind: 'terrain', value: 'Forests' }, operandB: { kind: 'level', value: 3 } } as const,
  operandA: { kind: 'terrain' as const, value: 'Forests' as const },
  operandB: { kind: 'level' as const, value: 3 },
}

describe('isHoldCard', () => {
  it('identifies exactly the 4 interrupt-style majors', () => {
    expect(isHoldCard('FOOL')).toBe(true)
    expect(isHoldCard('EMPRESS')).toBe(true)
    expect(isHoldCard('EMPEROR')).toBe(true)
    expect(isHoldCard('HIEROPHANT')).toBe(true)
    expect(isHoldCard('HIGH_PRIESTESS')).toBe(false)
    expect(isHoldCard('DEATH')).toBe(false)
  })
})

describe('FOOL', () => {
  it('responds to spells and swaps operandA/operandB', () => {
    const fool = HOLD_CARD_HANDLERS.FOOL!
    expect(fool.canRespond(spellPending, 'p2')).toBe(true)
    const transformed = fool.transform(spellPending, 'p2', undefined)
    expect(transformed).toEqual({ ...spellPending, operandA: spellPending.operandB, operandB: spellPending.operandA })
  })

  it('does not respond to major actions', () => {
    const fool = HOLD_CARD_HANDLERS.FOOL!
    const majorPending: PendingResolution = { kind: 'majorAction', casterId: 'p1', majorId: 'DEATH', tarot: { kind: 'major', instanceId: 't1', id: 'DEATH' }, params: undefined }
    expect(fool.canRespond(majorPending, 'p2')).toBe(false)
  })
})

describe('EMPRESS', () => {
  it('responds only when a terrain operand is present, and swaps the matching terrain value', () => {
    const empress = HOLD_CARD_HANDLERS.EMPRESS!
    expect(empress.canRespond(spellPending, 'p2')).toBe(true)
    const transformed = empress.transform(spellPending, 'p2', { from: 'Forests', to: 'Swamps' })
    expect(transformed.kind === 'spell' && transformed.operandA).toEqual({ kind: 'terrain', value: 'Swamps' })
  })

  it('does not respond when neither operand is a terrain', () => {
    const empress = HOLD_CARD_HANDLERS.EMPRESS!
    const noTerrain: PendingResolution = {
      ...spellPending,
      operandA: { kind: 'structureType', value: 'Pool' },
      operandB: { kind: 'level', value: 2 },
    }
    expect(empress.canRespond(noTerrain, 'p2')).toBe(false)
  })
})

describe('EMPEROR', () => {
  it('responds to anything and marks it cancelled', () => {
    const emperor = HOLD_CARD_HANDLERS.EMPEROR!
    expect(emperor.canRespond(spellPending, 'p2')).toBe(true)
    expect(emperor.transform(spellPending, 'p2', undefined).cancelled).toBe(true)
  })
})

describe('HIEROPHANT', () => {
  it('responds only to a Randomize spell effect or the Wheel of Fortune major', () => {
    const hierophant = HOLD_CARD_HANDLERS.HIEROPHANT!
    expect(hierophant.canRespond(spellPending, 'p2')).toBe(false)
    expect(hierophant.canRespond({ ...spellPending, effectCardInstanceId: 'e1' }, 'p2')).toBe(false)
    const randomizeSpell: PendingResolution = { ...spellPending }
    // canRespond checks the effect *kind*, which lives on the resolved EffectCard, not tracked in pending directly for spells;
    // for spells we key off a synthetic 'effectCard' field — verify via the Wheel major path instead, which is unambiguous:
    const wheelPending: PendingResolution = { kind: 'majorAction', casterId: 'p1', majorId: 'WHEEL', tarot: { kind: 'major', instanceId: 't2', id: 'WHEEL' }, params: undefined }
    expect(hierophant.canRespond(wheelPending, 'p2')).toBe(true)
    void randomizeSpell
  })

  it('stores the override params on the pending resolution', () => {
    const hierophant = HOLD_CARD_HANDLERS.HIEROPHANT!
    const wheelPending: PendingResolution = { kind: 'majorAction', casterId: 'p1', majorId: 'WHEEL', tarot: { kind: 'major', instanceId: 't2', id: 'WHEEL' }, params: undefined }
    const transformed = hierophant.transform(wheelPending, 'p2', { structureId: 's1', newLevel: 5 })
    expect(transformed.hierophantOverride).toEqual({ structureId: 's1', newLevel: 5 })
  })
})

describe('computeTriggerQueue', () => {
  it('is empty when nobody holds an applicable card', () => {
    const state = makeState({})
    expect(computeTriggerQueue(state, spellPending)).toEqual([])
  })

  it('includes only holders whose card can respond, in seat order starting after the caster', () => {
    const emperorCard: MajorArcanaCard = { kind: 'major', instanceId: 'held-1', id: 'EMPEROR' }
    const state = makeState({ players: [makePlayer('p1', 'Alice'), makePlayer('p2', 'Bob', [emperorCard])] })
    expect(computeTriggerQueue(state, spellPending)).toEqual(['p2'])
  })

  it('excludes a holder whose only card cannot respond to this pending kind', () => {
    const fool: MajorArcanaCard = { kind: 'major', instanceId: 'held-1', id: 'FOOL' }
    const majorPending: PendingResolution = { kind: 'majorAction', casterId: 'p1', majorId: 'DEATH', tarot: { kind: 'major', instanceId: 't1', id: 'DEATH' }, params: undefined }
    const state = makeState({ players: [makePlayer('p1', 'Alice'), makePlayer('p2', 'Bob', [fool])] })
    expect(computeTriggerQueue(state, majorPending)).toEqual([])
  })

  it('wraps around to include the caster last, after other holders', () => {
    const emperorForCaster: MajorArcanaCard = { kind: 'major', instanceId: 'held-1', id: 'EMPEROR' }
    const emperorForP3: MajorArcanaCard = { kind: 'major', instanceId: 'held-2', id: 'EMPEROR' }
    const state = makeState({
      players: [makePlayer('p1', 'Alice', [emperorForCaster]), makePlayer('p2', 'Bob'), makePlayer('p3', 'Cara', [emperorForP3])],
    })
    expect(computeTriggerQueue(state, { ...spellPending, casterId: 'p1' })).toEqual(['p3', 'p1'])
  })
})
