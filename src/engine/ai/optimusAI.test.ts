import { describe, expect, it } from 'vitest'
import { applyAction } from '../reducer'
import { createInitialGameState } from '../setup'
import type { GameState } from '../types/state'
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
