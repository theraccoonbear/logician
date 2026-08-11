import { describe, expect, it } from 'vitest'
import { resolveWorld } from './world'
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
    ...overrides,
  }
}

function structure(overrides: Partial<Structure> & Pick<Structure, 'id' | 'type'>): Structure {
  return { owner: 'p2', hexId: 'hex-1', level: LEVEL_BOUNDS[overrides.type].floor, fortressed: false, ...overrides }
}

const tarot: MajorArcanaCard = { kind: 'major', instanceId: 'world-1', id: 'WORLD' }

describe('resolveWorld', () => {
  it('rejects two same-category conditions', () => {
    const state = makeState({ tarotRow: [tarot] })
    const result = resolveWorld(state, 'p1', tarot, {
      condition1: { kind: 'structureType', value: 'Pool' },
      condition2: { kind: 'structureType', value: 'Tower' },
      logicKind: 'A',
    })
    expect(result.ok).toBe(false)
  })

  it('uses no hand cards, applies Upgrade 1 to matched structures, and discards/refills the tarot', () => {
    const pool = structure({ id: 'pool', type: 'Pool', level: 1, hexId: 'hex-1' })
    const tower = structure({ id: 'tower', type: 'Tower', level: 3, hexId: 'hex-1' })
    const state = makeState({
      structures: [pool, tower],
      tarotRow: [tarot],
      players: [
        { ...makePlayer('p1', 'Alice'), logicHand: [{ instanceId: 'l1', kind: 'A' }], effectHand: [{ instanceId: 'e1', kind: 'UPGRADE_3' }] },
        makePlayer('p2', 'Bob'),
      ],
    })
    const result = resolveWorld(state, 'p1', tarot, {
      condition1: { kind: 'terrain', value: 'Forests' },
      condition2: { kind: 'structureType', value: 'Pool' },
      logicKind: 'A_AND_B',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.structures.find((s) => s.id === 'pool')!.level).toBe(2)
    expect(result.state.structures.find((s) => s.id === 'tower')!.level).toBe(3) // untouched, not a Pool
    // No hand cards were touched — World doesn't use them.
    expect(result.state.players[0].logicHand.some((c) => c.instanceId === 'l1')).toBe(true)
    expect(result.state.players[0].effectHand.some((c) => c.instanceId === 'e1')).toBe(true)
    expect(result.state.tarotRow.some((t) => t.instanceId === 'world-1')).toBe(false)
  })
})
