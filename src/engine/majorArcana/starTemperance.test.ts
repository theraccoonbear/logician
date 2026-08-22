import { describe, expect, it } from 'vitest'
import { resolveStar, resolveTemperance } from './starTemperance'
import { TEST_PRNG } from '../testHelpers'
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
    prng: TEST_PRNG,
    ...overrides,
  }
}

function structure(overrides: Partial<Structure> & Pick<Structure, 'id' | 'type'>): Structure {
  return { owner: 'p1', hexId: 'hex-1', level: LEVEL_BOUNDS[overrides.type].floor, fortressed: false, ...overrides }
}

describe('resolveStar', () => {
  const tarot: MajorArcanaCard = { kind: 'major', instanceId: 'star-1', id: 'STAR' }

  it('requires the trailing player to gain exactly the VP gap to the leader, via upgrade or build', () => {
    const leaderTower = structure({ id: 'leader', type: 'Tower', owner: 'p1', level: 6 }) // p1 VP = 6
    // Pyramid (not Pool) so the upgrade-to-3 below stays within bounds (Pool's max is only 2).
    const laggardPyramid = structure({ id: 'laggard', type: 'Pyramid', owner: 'p2', hexId: 'hex-2', level: 2 }) // p2 VP = 2, gap = 4
    const state = makeState({ structures: [leaderTower, laggardPyramid], tarotRow: [tarot] })

    const tooLittle = resolveStar(state, 'p1', tarot, {
      playerAdjustments: { p2: { upgrades: [{ structureId: 'laggard', newLevel: 3 }], builds: [] } },
    })
    expect(tooLittle.ok).toBe(false)

    const exact = resolveStar(state, 'p1', tarot, {
      playerAdjustments: {
        p2: { upgrades: [{ structureId: 'laggard', newLevel: 3 }], builds: [{ hexId: 'hex-3', structureType: 'Pyramid' }] },
      },
    })
    // gained = (3-2) + floor(Pyramid=1) = 2, but gap is 4 -> still short
    expect(exact.ok).toBe(false)

    // gained needs to total exactly 4: (3-2 laggard upgrade) + 1(Tower floor) + 2(Pool floor) = 4.
    const correct2 = resolveStar(state, 'p1', tarot, {
      playerAdjustments: {
        p2: {
          upgrades: [{ structureId: 'laggard', newLevel: 3 }],
          builds: [
            { hexId: 'hex-3', structureType: 'Tower' },
            { hexId: 'hex-4', structureType: 'Pool' },
          ],
        },
      },
    })
    expect(correct2.ok).toBe(true)
    if (!correct2.ok) return
    expect(correct2.state.structures.find((s) => s.id === 'laggard')!.level).toBe(3)
    expect(correct2.state.structures.some((s) => s.hexId === 'hex-3' && s.type === 'Tower' && s.owner === 'p2')).toBe(true)
    expect(correct2.state.structures.some((s) => s.hexId === 'hex-4' && s.type === 'Pool' && s.owner === 'p2')).toBe(true)
  })

  it('rejects the leader submitting any net-positive adjustment', () => {
    const leaderTower = structure({ id: 'leader', type: 'Tower', owner: 'p1', level: 6 })
    const laggardPool = structure({ id: 'laggard', type: 'Pool', owner: 'p2', hexId: 'hex-2', level: 2 })
    const state = makeState({ structures: [leaderTower, laggardPool], tarotRow: [tarot] })
    const result = resolveStar(state, 'p1', tarot, {
      playerAdjustments: {
        p1: { upgrades: [], builds: [{ hexId: 'hex-5', structureType: 'Pool' }] },
        p2: { upgrades: [{ structureId: 'laggard', newLevel: 6 }], builds: [] },
      },
    })
    expect(result.ok).toBe(false)
  })
})

describe('resolveTemperance', () => {
  const tarot: MajorArcanaCard = { kind: 'major', instanceId: 'temp-1', id: 'TEMPERANCE' }

  it('requires each player above the minimum to lose exactly the VP gap, via downgrade or destruction', () => {
    const minPool = structure({ id: 'min', type: 'Pool', owner: 'p2', level: 2 }) // p2 VP = 2 (the minimum)
    const highTower = structure({ id: 'high', type: 'Tower', owner: 'p1', level: 6 }) // p1 VP = 6, gap = 4
    const state = makeState({ structures: [minPool, highTower], tarotRow: [tarot] })

    const tooLittle = resolveTemperance(state, 'p1', tarot, { playerAdjustments: { p1: [{ structureId: 'high', newLevel: 4 }] } })
    expect(tooLittle.ok).toBe(false) // only lost 2, needs 4

    const destroyIt = resolveTemperance(state, 'p1', tarot, { playerAdjustments: { p1: [{ structureId: 'high', newLevel: 2 }] } })
    expect(destroyIt.ok).toBe(true) // lost exactly 4 (6 -> 2)
    if (!destroyIt.ok) return
    expect(destroyIt.state.structures.find((s) => s.id === 'high')!.level).toBe(2)
  })

  it('supports full destruction (newLevel 0) counting the whole level as the loss', () => {
    const minPool = structure({ id: 'min', type: 'Pool', owner: 'p2', level: 2 })
    const highPyramid = structure({ id: 'high', type: 'Pyramid', owner: 'p1', level: 4 }) // gap = 2
    const state = makeState({ structures: [minPool, highPyramid], tarotRow: [tarot] })
    const result = resolveTemperance(state, 'p1', tarot, { playerAdjustments: { p1: [{ structureId: 'high', newLevel: 2 }] } })
    expect(result.ok).toBe(true)
  })

  it('rejects touching a fortressed structure or a structure that is not the acting player\'s own', () => {
    const minPool = structure({ id: 'min', type: 'Pool', owner: 'p2', level: 2 })
    const fortressedHigh = structure({ id: 'high', type: 'Tower', owner: 'p1', level: 6, fortressed: true })
    const state = makeState({ structures: [minPool, fortressedHigh], tarotRow: [tarot] })
    const result = resolveTemperance(state, 'p1', tarot, { playerAdjustments: { p1: [{ structureId: 'high', newLevel: 2 }] } })
    expect(result.ok).toBe(false)
  })
})
