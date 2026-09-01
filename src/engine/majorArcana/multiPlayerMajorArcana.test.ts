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
      { id: 'p1', name: 'Alice', isAI: false, logicHand: [makeLogicCard('l1', 'A_AND_B')], effectHand: [{ instanceId: 'e1', kind: 'UPGRADE_1' }, { instanceId: 'e-down3', kind: 'DOWNGRADE_3' }], heldMajorArcana: [] },
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

describe('activePlayerIndex tracking during major choice', () => {
  it('sets activePlayerIndex to responder on entering awaitingMajorChoice', () => {
    const lovers = makeMajorTarot('LOVERS', 'lovers-1')
    let state = makeState({ tarotRow: [lovers] })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA',
      playerId: 'p1',
      tarotId: 'lovers-1',
      params: { casterValue: 3, logicCardId: 'l1', effectCardId: 'e1' },
    }))

    expect(state.phase).toBe('awaitingMajorChoice')
    expect(state.majorChoiceQueue).toEqual(['p2'])
    expect(state.activePlayerIndex).toBe(1)
  })

  it('advances activePlayerIndex through queue on multi-step Devil', () => {
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
    expect(state.activePlayerIndex).toBe(1)

    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE',
      playerId: 'p2',
      choice: { condition: { kind: 'terrain', value: 'Forests' } },
    }))

    expect(state.majorChoiceQueue).toEqual(['p2'])
    expect(state.activePlayerIndex).toBe(1)
  })

  it('resets activePlayerIndex to caster before advanceTurn on resolution', () => {
    const lovers = makeMajorTarot('LOVERS', 'lovers-1')
    let state = makeState({ tarotRow: [lovers] })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA',
      playerId: 'p1',
      tarotId: 'lovers-1',
      params: { casterValue: 3, logicCardId: 'l1', effectCardId: 'e1' },
    }))

    expect(state.activePlayerIndex).toBe(1)

    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE',
      playerId: 'p2',
      choice: { opponentValue: 'Forests' },
    }))

    expect(state.phase).toBe('build')
    expect(state.activePlayerIndex).toBe(1)
  })

  it('Star advances activePlayerIndex: opponent first, then caster', () => {
    const star = makeMajorTarot('STAR', 'star-1')
    const p1Structure = { id: 's1', type: 'Tower' as const, owner: 'p1', hexId: 'hex-1', level: 5, fortressed: false }
    const p2Structure = { id: 's2', type: 'Tower' as const, owner: 'p2', hexId: 'hex-2', level: 2, fortressed: false }
    let state = makeState({ tarotRow: [star], structures: [p1Structure, p2Structure] })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA', playerId: 'p1', tarotId: 'star-1',
    }))

    expect(state.activePlayerIndex).toBe(1)
    expect(state.majorChoiceQueue).toEqual(['p2', 'p1'])

    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE', playerId: 'p2',
      choice: { playerAdjustments: { p2: { upgrades: [{ structureId: 's2', newLevel: 5 }], builds: [] } } },
    }))

    expect(state.activePlayerIndex).toBe(0)
    expect(state.majorChoiceQueue).toEqual(['p1'])

    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE', playerId: 'p1',
      choice: { playerAdjustments: { p1: { upgrades: [], builds: [] } } },
    }))

    expect(state.phase).toBe('build')
    // advanceTurn bumps to next player after resolution
    expect(state.activePlayerIndex).toBe(1)
  })

  it('Temperance advances activePlayerIndex: opponent first, then caster', () => {
    const temperance = makeMajorTarot('TEMPERANCE', 'temperance-1')
    const p1Structure = { id: 's1', type: 'Tower' as const, owner: 'p1', hexId: 'hex-1', level: 3, fortressed: false }
    const p2Structure = { id: 's2', type: 'Pool' as const, owner: 'p2', hexId: 'hex-2', level: 5, fortressed: false }
    let state = makeState({ tarotRow: [temperance], structures: [p1Structure, p2Structure] })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA', playerId: 'p1', tarotId: 'temperance-1',
    }))

    expect(state.activePlayerIndex).toBe(1)
    expect(state.majorChoiceQueue).toEqual(['p2', 'p1'])

    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE', playerId: 'p2',
      choice: { playerAdjustments: { p2: [{ structureId: 's2', newLevel: 3 }] } },
    }))

    expect(state.activePlayerIndex).toBe(0)
    expect(state.majorChoiceQueue).toEqual(['p1'])

    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE', playerId: 'p1',
      choice: { playerAdjustments: { p1: [] } },
    }))

    expect(state.phase).toBe('build')
    // advanceTurn bumps to next player after resolution
    expect(state.activePlayerIndex).toBe(1)
  })

  it('rejects SUBMIT_OPPONENT_CHOICE when not in awaitingMajorChoice phase', () => {
    let state = makeState({ tarotRow: [] })

    const err = expectErr(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE', playerId: 'p2',
      choice: { opponentValue: 'Forests' },
    }))
    expect(err).toContain('No opponent choice')
  })

  it('rejects CANCEL_MAJOR_CHOICE from non-caster', () => {
    const lovers = makeMajorTarot('LOVERS', 'lovers-1')
    let state = makeState({ tarotRow: [lovers] })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA', playerId: 'p1', tarotId: 'lovers-1',
      params: { casterValue: 3, logicCardId: 'l1', effectCardId: 'e1' },
    }))

    const err = expectErr(applyAction(state, {
      type: 'CANCEL_MAJOR_CHOICE', playerId: 'p2',
    }))
    expect(err).toContain('Only the caster')
  })

  it('Hanged Man: full flow with terrain + structureType operands', () => {
    const hangedMan = makeMajorTarot('HANGED_MAN', 'hm-1')
    let state = makeState({ tarotRow: [hangedMan] })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA', playerId: 'p1', tarotId: 'hm-1',
      params: { casterValue: 'Forests', logicCardId: 'l1', effectCardId: 'e1' },
    }))

    expect(state.phase).toBe('awaitingMajorChoice')
    expect(state.pendingMajorChoice!.majorId).toBe('HANGED_MAN')
    expect(state.pendingMajorChoice!.casterParams.casterValue).toBe('Forests')
    expect(state.majorChoiceQueue).toEqual(['p2'])
    expect(state.activePlayerIndex).toBe(1)

    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE', playerId: 'p2',
      choice: { opponentValue: 'Tower' },
    }))

    expect(state.phase).toBe('build')
    expect(state.pendingMajorChoice).toBeUndefined()
    expect(state.majorChoiceQueue).toBeUndefined()
    expect(state.activePlayerIndex).toBe(1)
  })

  it('Justice: full flow with terrain + level operands', () => {
    const justice = makeMajorTarot('JUSTICE', 'jus-1')
    let state = makeState({ tarotRow: [justice] })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA', playerId: 'p1', tarotId: 'jus-1',
      params: { casterValue: 'Mountains', logicCardId: 'l1', effectCardId: 'e1' },
    }))

    expect(state.pendingMajorChoice!.majorId).toBe('JUSTICE')
    expect(state.pendingMajorChoice!.casterParams.casterValue).toBe('Mountains')
    expect(state.majorChoiceQueue).toEqual(['p2'])

    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE', playerId: 'p2',
      choice: { opponentValue: 4 },
    }))

    expect(state.phase).toBe('build')
  })

  it('Moon: full flow with structureType + terrain operands', () => {
    const moon = makeMajorTarot('MOON', 'moon-1')
    let state = makeState({ tarotRow: [moon] })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA', playerId: 'p1', tarotId: 'moon-1',
      params: { casterValue: 'Pyramid', logicCardId: 'l1', effectCardId: 'e1' },
    }))

    expect(state.pendingMajorChoice!.majorId).toBe('MOON')
    expect(state.pendingMajorChoice!.casterParams.casterValue).toBe('Pyramid')
    expect(state.majorChoiceQueue).toEqual(['p2'])

    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE', playerId: 'p2',
      choice: { opponentValue: 'Swamps' },
    }))

    expect(state.phase).toBe('build')
  })

  it('Sun: full flow with level + structureType operands', () => {
    const sun = makeMajorTarot('SUN', 'sun-1')
    let state = makeState({ tarotRow: [sun] })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA', playerId: 'p1', tarotId: 'sun-1',
      params: { casterValue: 2, logicCardId: 'l1', effectCardId: 'e1' },
    }))

    expect(state.pendingMajorChoice!.majorId).toBe('SUN')
    expect(state.pendingMajorChoice!.casterParams.casterValue).toBe(2)
    expect(state.majorChoiceQueue).toEqual(['p2'])

    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE', playerId: 'p2',
      choice: { opponentValue: 'Pool' },
    }))

    expect(state.phase).toBe('build')
  })

  it('rejects CANCEL_MAJOR_CHOICE when not in awaitingMajorChoice', () => {
    let state = makeState({ tarotRow: [] })
    const err = expectErr(applyAction(state, {
      type: 'CANCEL_MAJOR_CHOICE', playerId: 'p1',
    }))
    expect(err).toContain('No major choice')
  })
})

describe('forced-operand major arcana: board-level integration', () => {
  function makeBoardWithMixedTerrain() {
    return [
      { id: 'hex-1', terrain: 'Forests' as const },
      { id: 'hex-2', terrain: 'Mountains' as const },
      { id: 'hex-3', terrain: 'Swamps' as const },
      { id: 'hex-4', terrain: 'Prairies' as const },
      { id: 'hex-5', terrain: 'Forests' as const },
      { id: 'hex-6', terrain: 'Mountains' as const },
      { id: 'hex-7', terrain: 'Forests' as const },
      { id: 'hex-8', terrain: 'Swamps' as const },
      { id: 'hex-9', terrain: 'Mountains' as const },
      { id: 'hex-10', terrain: 'Prairies' as const },
    ]
  }

  const structures = [
    { id: 's1', type: 'Tower' as const, owner: 'p1', hexId: 'hex-1', level: 3, fortressed: false },
    { id: 's2', type: 'Tower' as const, owner: 'p2', hexId: 'hex-2', level: 4, fortressed: false },
    { id: 's3', type: 'Pyramid' as const, owner: 'p1', hexId: 'hex-3', level: 2, fortressed: false },
    { id: 's4', type: 'Pool' as const, owner: 'p2', hexId: 'hex-4', level: 2, fortressed: false },
  ]

  it('Hanged Man upgrades Forests Towers after full pipeline', () => {
    const hm = makeMajorTarot('HANGED_MAN', 'hm-1')
    let state = makeState({
      tarotRow: [hm],
      board: makeBoardWithMixedTerrain(),
      structures: [...structures],
    })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA', playerId: 'p1', tarotId: 'hm-1',
      params: { casterValue: 'Forests', logicCardId: 'l1', effectCardId: 'e1' },
    }))
    expect(state.phase).toBe('awaitingMajorChoice')
    expect(state.activePlayerIndex).toBe(1)

    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE', playerId: 'p2',
      choice: { opponentValue: 'Tower' },
    }))

    expect(state.phase).toBe('build')
    expect(state.pendingMajorChoice).toBeUndefined()
    const upgraded = state.structures.find((s) => s.id === 's1')!
    expect(upgraded.level).toBe(4)
    const notMatched = state.structures.find((s) => s.id === 's3')!
    expect(notMatched.level).toBe(2)
  })

  it('Hanged Man destroys low-level Forests Towers with DOWNGRADE_3', () => {
    const hm = makeMajorTarot('HANGED_MAN', 'hm-2')
    let state = makeState({
      tarotRow: [hm],
      board: makeBoardWithMixedTerrain(),
      structures: [
        { id: 's1', type: 'Tower' as const, owner: 'p1', hexId: 'hex-1', level: 1, fortressed: false },
        ...structures.slice(1),
      ],
    })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA', playerId: 'p1', tarotId: 'hm-2',
      params: { casterValue: 'Forests', logicCardId: 'l1', effectCardId: 'e-down3' },
    }))
    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE', playerId: 'p2',
      choice: { opponentValue: 'Tower' },
    }))

    expect(state.structures.find((s) => s.id === 's1')).toBeUndefined()
    expect(state.structures).toHaveLength(3)
  })

  it('Justice: opponent picks level 4, caster picks Mountains -> targets Mountain level-4 structures', () => {
    const jus = makeMajorTarot('JUSTICE', 'jus-1')
    let state = makeState({
      tarotRow: [jus],
      board: makeBoardWithMixedTerrain(),
      structures: [...structures],
    })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA', playerId: 'p1', tarotId: 'jus-1',
      params: { casterValue: 'Mountains', logicCardId: 'l1', effectCardId: 'e1' },
    }))
    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE', playerId: 'p2',
      choice: { opponentValue: 4 },
    }))

    expect(state.phase).toBe('build')
    const mountainTower = state.structures.find((s) => s.id === 's2')!
    expect(mountainTower.level).toBe(5)
  })

  it('Moon: caster picks Pyramid, opponent picks Swamps -> targets Swamp Pyramids', () => {
    const moon = makeMajorTarot('MOON', 'moon-1')
    const swampPyramid = { id: 's5', type: 'Pyramid' as const, owner: 'p2', hexId: 'hex-3', level: 3, fortressed: false }
    let state = makeState({
      tarotRow: [moon],
      board: makeBoardWithMixedTerrain(),
      structures: [...structures, swampPyramid],
    })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA', playerId: 'p1', tarotId: 'moon-1',
      params: { casterValue: 'Pyramid', logicCardId: 'l1', effectCardId: 'e1' },
    }))
    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE', playerId: 'p2',
      choice: { opponentValue: 'Swamps' },
    }))

    expect(state.phase).toBe('build')
    expect(state.structures.find((s) => s.id === 's5')!.level).toBe(4)
  })

  it('Sun: caster picks level 2, opponent picks Pool -> targets Pools at level 2', () => {
    const sun = makeMajorTarot('SUN', 'sun-1')
    let state = makeState({
      tarotRow: [sun],
      board: makeBoardWithMixedTerrain(),
      structures: [...structures],
    })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA', playerId: 'p1', tarotId: 'sun-1',
      params: { casterValue: 2, logicCardId: 'l1', effectCardId: 'e1' },
    }))
    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE', playerId: 'p2',
      choice: { opponentValue: 'Pool' },
    }))

    expect(state.phase).toBe('build')
    expect(state.structures.find((s) => s.id === 's4')!.level).toBe(3)
  })

  it('Lovers: caster picks level 3, opponent picks terrain -> targets matching terrain+level', () => {
    const lovers = makeMajorTarot('LOVERS', 'lovers-1')
    let state = makeState({
      tarotRow: [lovers],
      board: makeBoardWithMixedTerrain(),
      structures: [...structures],
    })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA', playerId: 'p1', tarotId: 'lovers-1',
      params: { casterValue: 3, logicCardId: 'l1', effectCardId: 'e1' },
    }))
    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE', playerId: 'p2',
      choice: { opponentValue: 'Forests' },
    }))

    expect(state.phase).toBe('build')
    expect(state.structures.find((s) => s.id === 's1')!.level).toBe(4)
  })
})

describe('activePlayerIndex alignment with UI routing', () => {
  it('awaitingMajorChoice: activePlayerIndex matches majorChoiceQueue[0] (the responder)', () => {
    const hm = makeMajorTarot('HANGED_MAN', 'hm-1')
    let state = makeState({ tarotRow: [hm] })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA', playerId: 'p1', tarotId: 'hm-1',
      params: { casterValue: 'Forests', logicCardId: 'l1', effectCardId: 'e1' },
    }))

    const activePlayer = state.players[state.activePlayerIndex]
    expect(activePlayer.id).toBe(state.majorChoiceQueue![0])
    expect(activePlayer.id).toBe('p2')
  })

  it('awaitingMajorChoice for Devil: activePlayerIndex matches majorChoiceQueue[0]', () => {
    const devil = makeMajorTarot('DEVIL', 'devil-1')
    let state = makeState({ tarotRow: [devil] })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA', playerId: 'p1', tarotId: 'devil-1',
      params: { logicCardId: 'l1' },
    }))

    const activePlayer = state.players[state.activePlayerIndex]
    expect(activePlayer.id).toBe(state.majorChoiceQueue![0])
  })

  it('awaitingMajorChoice for Star: activePlayerIndex matches majorChoiceQueue[0]', () => {
    const star = makeMajorTarot('STAR', 'star-1')
    const s1 = { id: 's1', type: 'Tower' as const, owner: 'p1', hexId: 'hex-1', level: 5, fortressed: false }
    const s2 = { id: 's2', type: 'Tower' as const, owner: 'p2', hexId: 'hex-2', level: 2, fortressed: false }
    let state = makeState({ tarotRow: [star], structures: [s1, s2] })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA', playerId: 'p1', tarotId: 'star-1',
    }))

    const activePlayer = state.players[state.activePlayerIndex]
    expect(activePlayer.id).toBe(state.majorChoiceQueue![0])
    expect(activePlayer.id).toBe('p2')
  })

  it('after first Star submission, activePlayerIndex shifts to second in queue', () => {
    const star = makeMajorTarot('STAR', 'star-1')
    const s1 = { id: 's1', type: 'Tower' as const, owner: 'p1', hexId: 'hex-1', level: 5, fortressed: false }
    const s2 = { id: 's2', type: 'Tower' as const, owner: 'p2', hexId: 'hex-2', level: 2, fortressed: false }
    let state = makeState({ tarotRow: [star], structures: [s1, s2] })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA', playerId: 'p1', tarotId: 'star-1',
    }))
    expect(state.players[state.activePlayerIndex].id).toBe('p2')

    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE', playerId: 'p2',
      choice: { playerAdjustments: { p2: { upgrades: [{ structureId: 's2', newLevel: 5 }], builds: [] } } },
    }))

    const activePlayer = state.players[state.activePlayerIndex]
    expect(activePlayer.id).toBe(state.majorChoiceQueue![0])
    expect(activePlayer.id).toBe('p1')
  })

  it('Devil: activePlayerIndex stays on responder across both condition submissions', () => {
    const devil = makeMajorTarot('DEVIL', 'devil-1')
    let state = makeState({ tarotRow: [devil] })

    state = expectOk(applyAction(state, {
      type: 'PLAY_MAJOR_ARCANA', playerId: 'p1', tarotId: 'devil-1',
      params: { logicCardId: 'l1' },
    }))
    expect(state.players[state.activePlayerIndex].id).toBe(state.majorChoiceQueue![0])

    state = expectOk(applyAction(state, {
      type: 'SUBMIT_OPPONENT_CHOICE', playerId: 'p2',
      choice: { condition: { kind: 'terrain', value: 'Forests' } },
    }))
    expect(state.players[state.activePlayerIndex].id).toBe(state.majorChoiceQueue![0])
    expect(state.majorChoiceQueue).toEqual(['p2'])
  })
})
