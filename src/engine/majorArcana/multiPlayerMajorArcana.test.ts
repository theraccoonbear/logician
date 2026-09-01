import { describe, expect, it } from 'vitest'
import { applyAction } from '../reducer'
import { TEST_PRNG } from '../testHelpers'
import { requiresOpponentChoice } from './forcedOperand'
import type { GameState } from '../types/state'
import type { TarotCard } from '../types/tarot'
import type { LogicCard } from '../types/cards'

function expectOk(result: ReturnType<typeof applyAction>): GameState {
  if (!result.ok) throw new Error(`Expected ok, got error: ${result.error}`)
  return result.state
}

function expectErr(result: ReturnType<typeof applyAction>): string {
  if (result.ok) throw new Error('Expected an error result')
  return result.error
}

function makeLogicCard(id: string, kind = 'A'): LogicCard {
  return { instanceId: id, kind: kind as LogicCard['kind'] }
}

function makeMajorTarot(id: string, instanceId: string): TarotCard {
  return { kind: 'major', id, instanceId } as TarotCard
}

function makeState(overrides: Partial<GameState>): GameState {
  const board = Array.from({ length: 10 }, (_, i) => ({ id: `hex-${i + 1}`, terrain: 'Forests' as const }))
  return {
    players: [
      { id: 'p1', name: 'Alice', isAI: false, logicHand: [makeLogicCard('l1', 'A_AND_B')], effectHand: [{ instanceId: 'e1', kind: 'UPGRADE_1' }], heldMajorArcana: [] },
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

describe('requiresOpponentChoice', () => {
  it('returns true for forced-operand cards and Devil', () => {
    expect(requiresOpponentChoice('LOVERS')).toBe(true)
    expect(requiresOpponentChoice('JUSTICE')).toBe(true)
    expect(requiresOpponentChoice('HANGED_MAN')).toBe(true)
    expect(requiresOpponentChoice('MOON')).toBe(true)
    expect(requiresOpponentChoice('SUN')).toBe(true)
    expect(requiresOpponentChoice('DEVIL')).toBe(true)
  })

  it('returns false for other cards', () => {
    expect(requiresOpponentChoice('DEATH')).toBe(false)
    expect(requiresOpponentChoice('TOWER')).toBe(false)
    expect(requiresOpponentChoice('WHEEL')).toBe(false)
    expect(requiresOpponentChoice('CHARIOT')).toBe(false)
  })
})

describe('multi-player Major Arcana flow', () => {
  it('PLAY_MAJOR_ARCANA with LOVERS enters awaitingMajorChoice', () => {
    const lovers = makeMajorTarot('LOVERS', 'lovers-1')
    let state = makeState({ tarotRow: [lovers] })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA',
      playerId: 'p1',
      tarotId: 'lovers-1',
      params: { casterValue: 3, logicCardId: 'l1', effectCardId: 'e1' },
    }))

    expect(state.phase).toBe('awaitingMajorChoice')
    expect(state.pendingMajorChoice).toBeDefined()
    expect(state.pendingMajorChoice!.majorId).toBe('LOVERS')
    expect(state.pendingMajorChoice!.casterParams.casterValue).toBe(3)
    expect(state.majorChoiceQueue).toEqual(['p2'])
  })

  it('SUBMIT_OPPONENT_CHOICE resolves after queue drains', () => {
    const lovers = makeMajorTarot('LOVERS', 'lovers-1')
    let state = makeState({ tarotRow: [lovers] })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA',
      playerId: 'p1',
      tarotId: 'lovers-1',
      params: { casterValue: 3, logicCardId: 'l1', effectCardId: 'e1' },
    }))

    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE',
      playerId: 'p2',
      choice: { opponentValue: 'Forests' },
    }))

    expect(state.phase).toBe('build')
    expect(state.pendingMajorChoice).toBeUndefined()
    expect(state.majorChoiceQueue).toBeUndefined()
    expect(state.activePlayerIndex).toBe(1)
  })

  it('CANCEL_MAJOR_CHOICE returns to cast phase', () => {
    const lovers = makeMajorTarot('LOVERS', 'lovers-1')
    let state = makeState({ tarotRow: [lovers] })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA',
      playerId: 'p1',
      tarotId: 'lovers-1',
      params: { casterValue: 3, logicCardId: 'l1', effectCardId: 'e1' },
    }))

    state = expectOk(applyAction(state, {
      type: 'CANCEL_MAJOR_CHOICE',
      playerId: 'p1',
    }))

    expect(state.phase).toBe('cast')
    expect(state.pendingMajorChoice).toBeUndefined()
  })

  it('rejects SUBMIT_OPPONENT_CHOICE from non-queue player', () => {
    const lovers = makeMajorTarot('LOVERS', 'lovers-1')
    let state = makeState({ tarotRow: [lovers] })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA',
      playerId: 'p1',
      tarotId: 'lovers-1',
      params: { casterValue: 3, logicCardId: 'l1', effectCardId: 'e1' },
    }))

    const err = expectErr(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE',
      playerId: 'p1',
      choice: { opponentValue: 'Forests' },
    }))
    expect(err).toContain('Not your turn')
  })

  it('rejects invalid opponent values', () => {
    const lovers = makeMajorTarot('LOVERS', 'lovers-1')
    let state = makeState({ tarotRow: [lovers] })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA',
      playerId: 'p1',
      tarotId: 'lovers-1',
      params: { casterValue: 3, logicCardId: 'l1', effectCardId: 'e1' },
    }))

    const err = expectErr(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE',
      playerId: 'p2',
      choice: { opponentValue: 'Atlantis' },
    }))
    expect(err).toContain('Invalid terrain')
  })

  it('Devil in 2P queues same opponent twice', () => {
    const devil = makeMajorTarot('DEVIL', 'devil-1')
    let state = makeState({ tarotRow: [devil] })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA',
      playerId: 'p1',
      tarotId: 'devil-1',
      params: { logicCardId: 'l1' },
    }))

    expect(state.phase).toBe('awaitingMajorChoice')
    expect(state.majorChoiceQueue).toEqual(['p2', 'p2'])
    expect(state.pendingMajorChoice!.devilConditionIndex).toBe(0)

    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE',
      playerId: 'p2',
      choice: { condition: { kind: 'terrain', value: 'Forests' } },
    }))

    expect(state.majorChoiceQueue).toEqual(['p2'])
    expect(state.pendingMajorChoice!.devilConditionIndex).toBe(1)
    expect(state.pendingMajorChoice!.opponentParams.condition1).toEqual({ kind: 'terrain', value: 'Forests' })

    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE',
      playerId: 'p2',
      choice: { condition: { kind: 'structureType', value: 'Pool' } },
    }))

    expect(state.phase).toBe('build')
    expect(state.pendingMajorChoice).toBeUndefined()
  })

  it('Devil rejects same-category conditions at resolution', () => {
    const devil = makeMajorTarot('DEVIL', 'devil-1')
    let state = makeState({ tarotRow: [devil] })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA',
      playerId: 'p1',
      tarotId: 'devil-1',
      params: { logicCardId: 'l1' },
    }))

    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE',
      playerId: 'p2',
      choice: { condition: { kind: 'terrain', value: 'Forests' } },
    }))

    const err = expectErr(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE',
      playerId: 'p2',
      choice: { condition: { kind: 'terrain', value: 'Mountains' } },
    }))
    expect(err).toContain('different categories')
  })
})
