import { describe, expect, it } from 'vitest'
import { resolveMagician } from './magician'
import type { Hex } from '../board'
import type { GameState, Player } from '../types/state'
import type { MajorArcanaCard } from '../types/tarot'

function makeState(overrides: Partial<GameState>): GameState {
  const board: Hex[] = Array.from({ length: 10 }, (_, i) => ({ id: `hex-${i + 1}`, terrain: 'Forests' as const }))
  const players: Player[] = [
    { id: 'p1', name: 'Alice', isAI: false, logicHand: [{ instanceId: 'l1', kind: 'A' }], effectHand: [{ instanceId: 'e1', kind: 'UPGRADE_1' }], heldMajorArcana: [] },
    { id: 'p2', name: 'Bob', isAI: false, logicHand: [{ instanceId: 'l2', kind: 'B' }], effectHand: [{ instanceId: 'e2', kind: 'DOWNGRADE_1' }], heldMajorArcana: [] },
  ]
  return {
    players,
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

const tarot: MajorArcanaCard = { kind: 'major', instanceId: 'magician-1', id: 'MAGICIAN' }

describe('resolveMagician', () => {
  it('rejects targeting yourself or a card not in the expected hand', () => {
    const state = makeState({ tarotRow: [tarot] })
    expect(resolveMagician(state, 'p1', tarot, { opponentId: 'p1', myLogicId: 'l1', myEffectId: 'e1', theirLogicId: 'l2', theirEffectId: 'e2' }).ok).toBe(false)
    expect(resolveMagician(state, 'p1', tarot, { opponentId: 'p2', myLogicId: 'ghost', myEffectId: 'e1', theirLogicId: 'l2', theirEffectId: 'e2' }).ok).toBe(false)
  })

  it('swaps exactly one Logic and one Effect card between the two hands', () => {
    const state = makeState({ tarotRow: [tarot] })
    const result = resolveMagician(state, 'p1', tarot, { opponentId: 'p2', myLogicId: 'l1', myEffectId: 'e1', theirLogicId: 'l2', theirEffectId: 'e2' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const [alice, bob] = result.state.players
    expect(alice.logicHand.map((c) => c.instanceId)).toEqual(['l2'])
    expect(alice.effectHand.map((c) => c.instanceId)).toEqual(['e2'])
    expect(bob.logicHand.map((c) => c.instanceId)).toEqual(['l1'])
    expect(bob.effectHand.map((c) => c.instanceId)).toEqual(['e1'])
  })
})
