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
  it('returns true for forced-operand cards, Devil, Star, and Temperance', () => {
    expect(requiresOpponentChoice('LOVERS')).toBe(true)
    expect(requiresOpponentChoice('JUSTICE')).toBe(true)
    expect(requiresOpponentChoice('HANGED_MAN')).toBe(true)
    expect(requiresOpponentChoice('MOON')).toBe(true)
    expect(requiresOpponentChoice('SUN')).toBe(true)
    expect(requiresOpponentChoice('DEVIL')).toBe(true)
    expect(requiresOpponentChoice('STAR')).toBe(true)
    expect(requiresOpponentChoice('TEMPERANCE')).toBe(true)
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

  it('Temperance queues both players and resolves with adjustments', () => {
    const temperance = makeMajorTarot('TEMPERANCE', 'temperance-1')
    const p1Structure = { id: 's1', type: 'Tower' as const, owner: 'p1', hexId: 'hex-1', level: 3, fortressed: false }
    const p2Structure = { id: 's2', type: 'Pool' as const, owner: 'p2', hexId: 'hex-2', level: 5, fortressed: false }
    let state = makeState({
      tarotRow: [temperance],
      structures: [p1Structure, p2Structure],
    })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA',
      playerId: 'p1',
      tarotId: 'temperance-1',
    }))

    expect(state.phase).toBe('awaitingMajorChoice')
    expect(state.majorChoiceQueue).toEqual(['p2', 'p1'])

    // p2 submits first (leader, must lose 2 VP: 5 -> 3)
    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE',
      playerId: 'p2',
      choice: { playerAdjustments: { p2: [{ structureId: 's2', newLevel: 3 }] } },
    }))

    expect(state.majorChoiceQueue).toEqual(['p1'])

    // p1 submits (at min, no adjustments needed)
    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE',
      playerId: 'p1',
      choice: { playerAdjustments: { p1: [] } },
    }))

    expect(state.phase).toBe('build')
    expect(state.pendingMajorChoice).toBeUndefined()
    // p2's structure should be downgraded
    expect(state.structures.find((s) => s.id === 's2')!.level).toBe(3)
  })

  it('Star queues both players and resolves with adjustments', () => {
    const star = makeMajorTarot('STAR', 'star-1')
    const p1Structure = { id: 's1', type: 'Tower' as const, owner: 'p1', hexId: 'hex-1', level: 5, fortressed: false }
    const p2Structure = { id: 's2', type: 'Tower' as const, owner: 'p2', hexId: 'hex-2', level: 2, fortressed: false }
    let state = makeState({
      tarotRow: [star],
      structures: [p1Structure, p2Structure],
    })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA',
      playerId: 'p1',
      tarotId: 'star-1',
    }))

    expect(state.phase).toBe('awaitingMajorChoice')
    expect(state.majorChoiceQueue).toEqual(['p2', 'p1'])

    // p2 submits first (laggard, needs +3 VP: 2 -> 5)
    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE',
      playerId: 'p2',
      choice: { playerAdjustments: { p2: { upgrades: [{ structureId: 's2', newLevel: 5 }], builds: [] } } },
    }))

    expect(state.majorChoiceQueue).toEqual(['p1'])

    // p1 submits (leader, no adjustments needed)
    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE',
      playerId: 'p1',
      choice: { playerAdjustments: { p1: { upgrades: [], builds: [] } } },
    }))

    expect(state.phase).toBe('build')
    expect(state.pendingMajorChoice).toBeUndefined()
    // p2's structure should be upgraded
    expect(state.structures.find((s) => s.id === 's2')!.level).toBe(5)
  })
})
