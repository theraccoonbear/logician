import { describe, expect, it } from 'vitest'
import { applyAction } from '../reducer'
import { createInitialGameState } from '../setup'
import type { GameState } from '../types/state'
import type { Structure } from '../types/structure'
import type { Hex } from '../board'
import { OptimusAI } from './optimusAI'
import { createAI } from './index'

function playFullGame(maxTurns = 500): GameState {
  let state = createInitialGameState([
    { name: 'Optimus Prime', isAI: true, aiDifficulty: 'optimus' },
    { name: 'Optimus Sub', isAI: true, aiDifficulty: 'optimus' },
  ])

  for (let i = 0; i < maxTurns && !state.winner; i += 1) {
    const player = state.players[state.activePlayerIndex]

    if (state.phase === 'setup' || state.phase === 'build') {
      const action = OptimusAI.chooseBuildAction(state, player.id)
      const result = applyAction(state, action)
      expect(result.ok, `illegal build action: ${JSON.stringify(action)}${result.ok ? '' : ` (${result.error})`}`).toBe(true)
      if (!result.ok) break
      state = result.state
      continue
    }

    if (state.phase === 'cast') {
      const action = OptimusAI.chooseCastAction(state, player.id)
      const result = applyAction(state, action)
      expect(result.ok, `illegal cast action: ${JSON.stringify(action)}${result.ok ? '' : ` (${result.error})`}`).toBe(true)
      if (!result.ok) break
      state = result.state
      continue
    }

    if (state.phase === 'awaitingTrigger') {
      const responderId = state.triggerQueue![0]
      const action = OptimusAI.respondToTriggerWindow(state, responderId)
      const result = applyAction(state, action)
      expect(result.ok).toBe(true)
      if (!result.ok) break
      state = result.state
    }
  }

  return state
}

function makeState(overrides: Partial<GameState>): GameState {
  const board: Hex[] = Array.from({ length: 10 }, (_, i) => ({ id: `hex-${i + 1}`, terrain: 'Forests' as const }))
  return {
    players: [
      { id: 'p1', name: 'Alice', isAI: true, logicHand: [], effectHand: [], heldMajorArcana: [] },
      { id: 'p2', name: 'Bob', isAI: true, logicHand: [], effectHand: [], heldMajorArcana: [] },
    ],
    activePlayerIndex: 0,
    phase: 'build',
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

describe('OptimusAI Factory', () => {
  it('instantiates OptimusAI correctly from createAI factory', () => {
    const ai = createAI('optimus')
    expect(ai).toBe(OptimusAI)
  })
})

describe('OptimusAI Game Simulation', () => {
  it('never produces an illegal action across a full simulated game against itself', () => {
    const final = playFullGame(500)
    expect(final.structures.length).toBeGreaterThan(0)
  })
})

describe('OptimusAI Strategic Improvements', () => {
  it('prefers to play High Priestess to boost built structures when holding it', () => {
    const hpCard = { kind: 'major' as const, instanceId: 'hp-1', id: 'HIGH_PRIESTESS' as const }
    const state = makeState({
      phase: 'build',
      players: [
        { id: 'p1', name: 'Alice', isAI: true, logicHand: [], effectHand: [], heldMajorArcana: [hpCard] },
        { id: 'p2', name: 'Bob', isAI: true, logicHand: [], effectHand: [], heldMajorArcana: [] },
      ],
    })

    const action = OptimusAI.chooseBuildAction(state, 'p1')
    expect(action.type).toBe('BUILD_STRUCTURE')
    if (action.type === 'BUILD_STRUCTURE') {
      expect(action.playHighPriestessCardId).toBe('hp-1')
    }
  })

  it('responds to triggers by playing Emperor to cancel a spell if it avoids substantial score damage', () => {
    const structures: Structure[] = [{ id: 's1', type: 'Tower', owner: 'p1', hexId: 'hex-1', level: 5, fortressed: false }]
    const emperorCard = { kind: 'major' as const, instanceId: 'emp-1', id: 'EMPEROR' as const }
    const state = makeState({
      phase: 'awaitingTrigger',
      structures,
      pendingTrigger: {
        kind: 'spell',
        casterId: 'p2',
        logicCardInstanceId: 'l1',
        logicCardKind: 'A',
        effectCardInstanceId: 'e1',
        effectCardKind: 'DOWNGRADE_3', // Devastating downgrade on Alice's Tower!
        tarot: { kind: 'minor', instanceId: 't1', suit: 'Cups', rank: '7', operandA: { kind: 'terrain', value: 'Forests' }, operandB: { kind: 'structureType', value: 'Tower' } },
        operandA: { kind: 'terrain', value: 'Forests' },
        operandB: { kind: 'structureType', value: 'Tower' },
      },
      triggerQueue: ['p1'],
      activePlayerIndex: 1, // Bob is active caster
      players: [
        { id: 'p1', name: 'Alice', isAI: true, logicHand: [], effectHand: [], heldMajorArcana: [emperorCard] },
        { id: 'p2', name: 'Bob', isAI: true, logicHand: [{ instanceId: 'l1', kind: 'A' }], effectHand: [{ instanceId: 'e1', kind: 'DOWNGRADE_3' }], heldMajorArcana: [] },
      ],
    })

    const action = OptimusAI.respondToTriggerWindow(state, 'p1')
    expect(action.type).toBe('PLAY_HELD_ARCANA')
    if (action.type === 'PLAY_HELD_ARCANA') {
      expect(action.cardId).toBe('emp-1')
    }
  })
})
