import { describe, expect, it } from 'vitest'
import { applyAction } from '../reducer'
import { createInitialGameState } from '../setup'
import type { GameState } from '../types/state'
import { HeuristicAI } from './heuristicAI'
import { RandomAI } from './randomAI'
import type { AIStrategy } from './aiStrategy'

/** Drives a full game using `ai` for every seat (both build and cast phases), asserting every action is legal. */
function playFullGame(ai: AIStrategy, maxTurns = 500): GameState {
  let state = createInitialGameState([
    { name: 'Alice', isAI: true },
    { name: 'Bob', isAI: true },
  ])

  for (let i = 0; i < maxTurns && !state.winner; i += 1) {
    const player = state.players[state.activePlayerIndex]

    if (state.phase === 'setup' || state.phase === 'build') {
      const action = ai.chooseBuildAction(state, player.id)
      const result = applyAction(state, action)
      expect(result.ok, `illegal build action: ${JSON.stringify(action)}${result.ok ? '' : ` (${result.error})`}`).toBe(true)
      if (!result.ok) break
      state = result.state
      continue
    }

    if (state.phase === 'cast') {
      const action = ai.chooseCastAction(state, player.id)
      const result = applyAction(state, action)
      expect(result.ok, `illegal cast action: ${JSON.stringify(action)}${result.ok ? '' : ` (${result.error})`}`).toBe(true)
      if (!result.ok) break
      state = result.state
      continue
    }

    if (state.phase === 'awaitingTrigger') {
      const responderId = state.triggerQueue![0]
      const action = ai.respondToTriggerWindow(state, responderId)
      const result = applyAction(state, action)
      expect(result.ok, `illegal trigger action: ${JSON.stringify(action)}${result.ok ? '' : ` (${result.error})`}`).toBe(true)
      if (!result.ok) break
      state = result.state
    }
  }

  return state
}

describe('RandomAI', () => {
  it('never produces an illegal action across a full simulated game', () => {
    const final = playFullGame(RandomAI, 500)
    expect(final.structures.length).toBeGreaterThan(0)
  })
})

describe('HeuristicAI', () => {
  it('never produces an illegal action across a full simulated game', () => {
    const final = playFullGame(HeuristicAI, 500)
    expect(final.structures.length).toBeGreaterThan(0)
  })

  it('prefers building over skipping when a build would improve its position', () => {
    let state = createInitialGameState([
      { name: 'Alice', isAI: true },
      { name: 'Bob', isAI: true },
    ])
    // Fast-forward through setup with the heuristic AI itself.
    while (state.phase === 'setup') {
      const player = state.players[state.activePlayerIndex]
      const result = applyAction(state, HeuristicAI.chooseBuildAction(state, player.id))
      if (!result.ok) throw new Error(result.error)
      state = result.state
    }
    const active = state.players[state.activePlayerIndex]
    const action = HeuristicAI.chooseBuildAction(state, active.id)
    expect(action.type).toBe('BUILD_STRUCTURE')
  })
})
