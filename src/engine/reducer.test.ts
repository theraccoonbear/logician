import { describe, expect, it } from 'vitest'
import { applyAction } from './reducer'
import { createInitialGameState } from './setup'
import type { GameState } from './types/state'
import type { Structure } from './types/structure'
import type { Hex } from './board'

function expectOk(result: ReturnType<typeof applyAction>): GameState {
  if (!result.ok) throw new Error(`Expected ok, got error: ${result.error}`)
  return result.state
}

function expectErr(result: ReturnType<typeof applyAction>): string {
  if (result.ok) throw new Error('Expected an error result')
  return result.error
}

describe('setup phase', () => {
  it('walks each player through placing Pool, Pyramid, Tower before starting real turns', () => {
    let state = createInitialGameState([
      { name: 'Alice', isAI: false },
      { name: 'Bob', isAI: true },
    ])
    const [alice, bob] = state.players

    state = expectOk(applyAction(state, { type: 'BUILD_STRUCTURE', playerId: alice.id, hexId: 'hex-1', structureType: 'Pool' }))
    expect(state.phase).toBe('setup')
    expect(state.activePlayerIndex).toBe(0)

    state = expectOk(applyAction(state, { type: 'BUILD_STRUCTURE', playerId: alice.id, hexId: 'hex-1', structureType: 'Pyramid' }))
    state = expectOk(applyAction(state, { type: 'BUILD_STRUCTURE', playerId: alice.id, hexId: 'hex-1', structureType: 'Tower' }))

    // Alice just placed her third structure -> setup hands off to Bob.
    expect(state.phase).toBe('setup')
    expect(state.activePlayerIndex).toBe(1)

    state = expectOk(applyAction(state, { type: 'BUILD_STRUCTURE', playerId: bob.id, hexId: 'hex-2', structureType: 'Pool' }))
    state = expectOk(applyAction(state, { type: 'BUILD_STRUCTURE', playerId: bob.id, hexId: 'hex-2', structureType: 'Pyramid' }))
    state = expectOk(applyAction(state, { type: 'BUILD_STRUCTURE', playerId: bob.id, hexId: 'hex-2', structureType: 'Tower' }))

    // Everyone has placed their trio -> real turns begin with player 0.
    expect(state.phase).toBe('build')
    expect(state.activePlayerIndex).toBe(0)
    expect(state.structures).toHaveLength(6)
  })

  it('rejects placing a duplicate type during setup, and acting out of turn', () => {
    let state = createInitialGameState([
      { name: 'Alice', isAI: false },
      { name: 'Bob', isAI: true },
    ])
    const [alice, bob] = state.players

    expect(expectErr(applyAction(state, { type: 'BUILD_STRUCTURE', playerId: bob.id, hexId: 'hex-2', structureType: 'Pool' }))).toMatch(
      /active player/i,
    )

    state = expectOk(applyAction(state, { type: 'BUILD_STRUCTURE', playerId: alice.id, hexId: 'hex-1', structureType: 'Pool' }))
    expect(expectErr(applyAction(state, { type: 'BUILD_STRUCTURE', playerId: alice.id, hexId: 'hex-3', structureType: 'Pool' }))).toMatch(
      /already placed/i,
    )
    expect(expectErr(applyAction(state, { type: 'BUILD_STRUCTURE', playerId: alice.id, hexId: 'hex-1', structureType: 'Fortress' }))).toMatch(
      /setup/i,
    )
  })
})

function makeState(overrides: Partial<GameState>): GameState {
  const board: Hex[] = Array.from({ length: 10 }, (_, i) => ({ id: `hex-${i + 1}`, terrain: 'Forests' as const }))
  return {
    players: [
      { id: 'p1', name: 'Alice', isAI: false, logicHand: [], effectHand: [], heldMajorArcana: [] },
      { id: 'p2', name: 'Bob', isAI: false, logicHand: [], effectHand: [], heldMajorArcana: [] },
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

describe('build phase', () => {
  it('building a basic structure moves to the cast phase for the same player', () => {
    const state = makeState({})
    const next = expectOk(applyAction(state, { type: 'BUILD_STRUCTURE', playerId: 'p1', hexId: 'hex-1', structureType: 'Pool' }))
    expect(next.phase).toBe('cast')
    expect(next.activePlayerIndex).toBe(0)
    expect(next.structures).toEqual([{ id: expect.any(String), type: 'Pool', owner: 'p1', hexId: 'hex-1', level: 2, fortressed: false }])
  })

  it('SKIP_BUILD also advances straight to the cast phase', () => {
    const state = makeState({})
    const next = expectOk(applyAction(state, { type: 'SKIP_BUILD', playerId: 'p1' }))
    expect(next.phase).toBe('cast')
    expect(next.structures).toHaveLength(0)
  })

  it('building a Fortress fortifies the trio and ends the turn immediately, skipping phase 2', () => {
    const trio: Structure[] = [
      { id: 'pool', type: 'Pool', owner: 'p1', hexId: 'hex-1', level: 2, fortressed: false },
      { id: 'pyr', type: 'Pyramid', owner: 'p1', hexId: 'hex-1', level: 1, fortressed: false },
      { id: 'tow', type: 'Tower', owner: 'p1', hexId: 'hex-1', level: 1, fortressed: false },
    ]
    const state = makeState({ structures: trio })
    const next = expectOk(applyAction(state, { type: 'BUILD_STRUCTURE', playerId: 'p1', hexId: 'hex-1', structureType: 'Fortress' }))

    // Turn advanced to the next player without ever reaching 'cast'.
    expect(next.activePlayerIndex).toBe(1)
    expect(next.phase).toBe('build')

    const basics = next.structures.filter((s) => s.type !== 'Fortress')
    expect(basics.every((s) => s.fortressed)).toBe(true)
    const fortress = next.structures.find((s) => s.type === 'Fortress')!
    expect(fortress.fortressed).toBe(false)
  })

  it('rejects a Fortress without a complete trio on that hex', () => {
    const state = makeState({ structures: [{ id: 'pool', type: 'Pool', owner: 'p1', hexId: 'hex-1', level: 2, fortressed: false }] })
    expect(expectErr(applyAction(state, { type: 'BUILD_STRUCTURE', playerId: 'p1', hexId: 'hex-1', structureType: 'Fortress' }))).toMatch(
      /Pool, Pyramid, and Tower/,
    )
  })
})

describe('cast phase', () => {
  it('casting a spell resolves the matched structures, discards/redraws cards, and advances the turn', () => {
    const structures: Structure[] = [
      { id: 'p1-pool', type: 'Pool', owner: 'p1', hexId: 'hex-1', level: 2, fortressed: false },
      { id: 'p2-pool', type: 'Pool', owner: 'p2', hexId: 'hex-2', level: 2, fortressed: false },
      { id: 'p1-tower', type: 'Tower', owner: 'p1', hexId: 'hex-1', level: 3, fortressed: false },
    ]
    const state = makeState({
      phase: 'cast',
      structures,
      tarotRow: [
        {
          kind: 'minor',
          instanceId: 'tarot-1',
          suit: 'Cups',
          rank: '7',
          operandA: { kind: 'terrain', value: 'Forests' },
          operandB: { kind: 'structureType', value: 'Pool' },
        },
      ],
    })
    const withHand = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0
          ? { ...p, logicHand: [{ instanceId: 'logic-1', kind: 'A' as const }], effectHand: [{ instanceId: 'effect-1', kind: 'UPGRADE_2' as const }] }
          : p,
      ),
    }

    const next = expectOk(
      applyAction(withHand, { type: 'CAST_SPELL', playerId: 'p1', logicCardId: 'logic-1', effectCardId: 'effect-1', tarotId: 'tarot-1' }),
    )

    // Logic card 'A' selects operandA (terrain=Forests) => both Pools (both on Forests hexes) upgrade by 2,
    // clamped to Pool's max of 3. Logic 'A' only cares about terrain, so the Tower (also on a Forests hex) is affected too.
    const p1Pool = next.structures.find((s) => s.id === 'p1-pool')!
    const p2Pool = next.structures.find((s) => s.id === 'p2-pool')!
    const p1Tower = next.structures.find((s) => s.id === 'p1-tower')!
    expect(p1Pool.level).toBe(3)
    expect(p2Pool.level).toBe(3)
    expect(p1Tower.level).toBe(5)

    expect(next.players[0].logicHand.some((c) => c.instanceId === 'logic-1')).toBe(false)
    expect(next.players[0].effectHand.some((c) => c.instanceId === 'effect-1')).toBe(false)
    expect(next.tarotRow.some((t) => t.instanceId === 'tarot-1')).toBe(false)
    expect(next.activePlayerIndex).toBe(1)
    expect(next.phase).toBe('build')
  })

  it('END_TURN passes phase 2 without casting', () => {
    const state = makeState({ phase: 'cast' })
    const next = expectOk(applyAction(state, { type: 'END_TURN', playerId: 'p1' }))
    expect(next.activePlayerIndex).toBe(1)
    expect(next.phase).toBe('build')
  })

  it('rejects casting with a Major Arcana tarot (not yet implemented)', () => {
    const state = makeState({
      phase: 'cast',
      players: [
        { id: 'p1', name: 'Alice', isAI: false, logicHand: [{ instanceId: 'l1', kind: 'A' }], effectHand: [{ instanceId: 'e1', kind: 'UPGRADE_1' }], heldMajorArcana: [] },
        { id: 'p2', name: 'Bob', isAI: false, logicHand: [], effectHand: [], heldMajorArcana: [] },
      ],
      tarotRow: [{ kind: 'major', instanceId: 't1', id: 'DEATH' }],
    })
    expect(
      expectErr(applyAction(state, { type: 'CAST_SPELL', playerId: 'p1', logicCardId: 'l1', effectCardId: 'e1', tarotId: 't1' })),
    ).toMatch(/not yet supported/)
  })
})

describe('PLAY_MAJOR_ARCANA dispatch', () => {
  it('rejects the wrong phase, a tarot not in the row, and a minor-arcana tarot', () => {
    const majorTarot = { kind: 'major' as const, instanceId: 't1', id: 'DEATH' as const }
    const buildPhase = makeState({ phase: 'build', tarotRow: [majorTarot] })
    expect(expectErr(applyAction(buildPhase, { type: 'PLAY_MAJOR_ARCANA', playerId: 'p1', tarotId: 't1' }))).toMatch(/phase/i)

    const castPhase = makeState({ phase: 'cast', tarotRow: [majorTarot] })
    expect(expectErr(applyAction(castPhase, { type: 'PLAY_MAJOR_ARCANA', playerId: 'p1', tarotId: 'missing' }))).toMatch(/active row/)

    const minorRow = makeState({
      phase: 'cast',
      tarotRow: [
        {
          kind: 'minor' as const,
          instanceId: 't2',
          suit: 'Cups' as const,
          rank: 'Ace' as const,
          operandA: { kind: 'terrain' as const, value: 'Forests' as const },
          operandB: { kind: 'level' as const, value: 1 },
        },
      ],
    })
    expect(expectErr(applyAction(minorRow, { type: 'PLAY_MAJOR_ARCANA', playerId: 'p1', tarotId: 't2' }))).toMatch(/not a Major Arcana/)
  })

  it('resolving Death end-to-end advances the turn and logs the action', () => {
    const majorTarot = { kind: 'major' as const, instanceId: 't1', id: 'DEATH' as const }
    const weak: Structure = { id: 'weak', type: 'Pyramid', owner: 'p1', hexId: 'hex-1', level: 1, fortressed: false }
    const strong: Structure = { id: 'strong', type: 'Tower', owner: 'p1', hexId: 'hex-1', level: 5, fortressed: false }
    const state = makeState({ phase: 'cast', structures: [weak, strong], tarotRow: [majorTarot] })

    const next = expectOk(applyAction(state, { type: 'PLAY_MAJOR_ARCANA', playerId: 'p1', tarotId: 't1' }))
    expect(next.structures.map((s) => s.id)).toEqual(['strong'])
    expect(next.activePlayerIndex).toBe(1)
    expect(next.phase).toBe('build')
    expect(next.log.at(-1)?.message).toMatch(/PLAY_MAJOR t:DEATH/)
  })
})

describe('win condition', () => {
  it('declares a winner once a player reaches 40 VP', () => {
    const structures: Structure[] = [{ id: 'big-tower', type: 'Tower', owner: 'p1', hexId: 'hex-1', level: 6, fortressed: false }]
    // 39 VP sitting elsewhere for p1, then one more build tips them to 40.
    const state = makeState({
      structures: [
        ...structures,
        ...Array.from({ length: 11 }, (_, i) => ({
          id: `filler-${i}`,
          type: 'Pyramid' as const,
          owner: 'p1',
          hexId: 'hex-1',
          level: 3,
          fortressed: false,
        })),
      ],
    })
    // current VP: 6 + 11*3 = 39
    const next = expectOk(applyAction(state, { type: 'BUILD_STRUCTURE', playerId: 'p1', hexId: 'hex-2', structureType: 'Pool' }))
    expect(next.winner).toBe('p1')
  })
})

describe('TAKE_HOLD_CARD', () => {
  it('moves a hold-type major from the row into the hand and ends the turn without any board effect', () => {
    const state = makeState({ phase: 'cast', tarotRow: [{ kind: 'major', instanceId: 'fool-1', id: 'FOOL' }] })
    const next = expectOk(applyAction(state, { type: 'TAKE_HOLD_CARD', playerId: 'p1', tarotId: 'fool-1' }))
    expect(next.players[0].heldMajorArcana.map((c) => c.instanceId)).toEqual(['fool-1'])
    expect(next.tarotRow.some((t) => t.instanceId === 'fool-1')).toBe(false)
    expect(next.activePlayerIndex).toBe(1)
    expect(next.structures).toHaveLength(0)
  })

  it('rejects taking an immediate-resolve major or High Priestess via PLAY_MAJOR_ARCANA path', () => {
    const state = makeState({ phase: 'cast', tarotRow: [{ kind: 'major', instanceId: 'death-1', id: 'DEATH' }] })
    expect(expectErr(applyAction(state, { type: 'TAKE_HOLD_CARD', playerId: 'p1', tarotId: 'death-1' }))).toMatch(/resolves immediately/)
  })
})

describe('trigger-window pipeline', () => {
  it('resolves immediately with no trigger window when nobody holds an applicable card', () => {
    const structures: Structure[] = [{ id: 's1', type: 'Tower', owner: 'p2', hexId: 'hex-1', level: 3, fortressed: false }]
    const state = makeState({
      phase: 'cast',
      structures,
      tarotRow: [
        { kind: 'minor', instanceId: 't1', suit: 'Cups', rank: '7', operandA: { kind: 'terrain', value: 'Forests' }, operandB: { kind: 'structureType', value: 'Tower' } },
      ],
      players: [
        { id: 'p1', name: 'Alice', isAI: false, logicHand: [{ instanceId: 'l1', kind: 'A' }], effectHand: [{ instanceId: 'e1', kind: 'UPGRADE_1' }], heldMajorArcana: [] },
        { id: 'p2', name: 'Bob', isAI: false, logicHand: [], effectHand: [], heldMajorArcana: [] },
      ],
    })
    const next = expectOk(applyAction(state, { type: 'CAST_SPELL', playerId: 'p1', logicCardId: 'l1', effectCardId: 'e1', tarotId: 't1' }))
    expect(next.phase).toBe('build')
    expect(next.structures.find((s) => s.id === 's1')!.level).toBe(4)
  })

  it('opens a trigger window for a holder of Emperor, who can cancel the pending spell entirely', () => {
    const structures: Structure[] = [{ id: 's1', type: 'Tower', owner: 'p1', hexId: 'hex-1', level: 3, fortressed: false }]
    const emperorCard = { kind: 'major' as const, instanceId: 'emp-1', id: 'EMPEROR' as const }
    const state = makeState({
      phase: 'cast',
      structures,
      tarotRow: [
        { kind: 'minor', instanceId: 't1', suit: 'Cups', rank: '7', operandA: { kind: 'terrain', value: 'Forests' }, operandB: { kind: 'structureType', value: 'Tower' } },
      ],
      players: [
        { id: 'p1', name: 'Alice', isAI: false, logicHand: [{ instanceId: 'l1', kind: 'A' }], effectHand: [{ instanceId: 'e1', kind: 'UPGRADE_1' }], heldMajorArcana: [] },
        { id: 'p2', name: 'Bob', isAI: false, logicHand: [], effectHand: [], heldMajorArcana: [emperorCard] },
      ],
    })

    const opened = expectOk(applyAction(state, { type: 'CAST_SPELL', playerId: 'p1', logicCardId: 'l1', effectCardId: 'e1', tarotId: 't1' }))
    expect(opened.phase).toBe('awaitingTrigger')
    expect(opened.triggerQueue).toEqual(['p2'])
    // The board hasn't changed yet — resolution is pending.
    expect(opened.structures.find((s) => s.id === 's1')!.level).toBe(3)

    const resolved = expectOk(applyAction(opened, { type: 'PLAY_HELD_ARCANA', playerId: 'p2', cardId: 'emp-1' }))
    expect(resolved.phase).toBe('build')
    expect(resolved.pendingTrigger).toBeUndefined()
    // Cancelled — the Tower never got upgraded.
    expect(resolved.structures.find((s) => s.id === 's1')!.level).toBe(3)
    expect(resolved.players[1].heldMajorArcana).toHaveLength(0)
    expect(resolved.activePlayerIndex).toBe(1)
  })

  it('a holder of Fool can swap A/B before the spell resolves', () => {
    // operandA=terrain Forests (everything matches, hex-1 is Forests), operandB=level 9 (nothing at level 9).
    // Swapping A/B means the spell now targets level 9 (nothing) instead of terrain Forests (the Tower) — so it should NOT affect the Tower.
    const structures: Structure[] = [{ id: 's1', type: 'Tower', owner: 'p1', hexId: 'hex-1', level: 3, fortressed: false }]
    const foolCard = { kind: 'major' as const, instanceId: 'fool-1', id: 'FOOL' as const }
    const state = makeState({
      phase: 'cast',
      structures,
      tarotRow: [
        { kind: 'minor', instanceId: 't1', suit: 'Cups', rank: '9', operandA: { kind: 'terrain', value: 'Forests' }, operandB: { kind: 'level', value: 9 } },
      ],
      players: [
        { id: 'p1', name: 'Alice', isAI: false, logicHand: [{ instanceId: 'l1', kind: 'A' }], effectHand: [{ instanceId: 'e1', kind: 'UPGRADE_1' }], heldMajorArcana: [] },
        { id: 'p2', name: 'Bob', isAI: false, logicHand: [], effectHand: [], heldMajorArcana: [foolCard] },
      ],
    })
    const opened = expectOk(applyAction(state, { type: 'CAST_SPELL', playerId: 'p1', logicCardId: 'l1', effectCardId: 'e1', tarotId: 't1' }))
    const afterFool = expectOk(applyAction(opened, { type: 'PLAY_HELD_ARCANA', playerId: 'p2', cardId: 'fool-1' }))
    // Fool swapped A/B, then the window closed (Bob was the only holder), so it resolved with Logic 'A' now selecting level 9 -> nothing matches.
    expect(afterFool.structures.find((s) => s.id === 's1')!.level).toBe(3)
  })

  it('PASS_TRIGGER_WINDOW lets the resolution proceed normally', () => {
    const structures: Structure[] = [{ id: 's1', type: 'Tower', owner: 'p1', hexId: 'hex-1', level: 3, fortressed: false }]
    const emperorCard = { kind: 'major' as const, instanceId: 'emp-1', id: 'EMPEROR' as const }
    const state = makeState({
      phase: 'cast',
      structures,
      tarotRow: [
        { kind: 'minor', instanceId: 't1', suit: 'Cups', rank: '7', operandA: { kind: 'terrain', value: 'Forests' }, operandB: { kind: 'structureType', value: 'Tower' } },
      ],
      players: [
        { id: 'p1', name: 'Alice', isAI: false, logicHand: [{ instanceId: 'l1', kind: 'A' }], effectHand: [{ instanceId: 'e1', kind: 'UPGRADE_1' }], heldMajorArcana: [] },
        { id: 'p2', name: 'Bob', isAI: false, logicHand: [], effectHand: [], heldMajorArcana: [emperorCard] },
      ],
    })
    const opened = expectOk(applyAction(state, { type: 'CAST_SPELL', playerId: 'p1', logicCardId: 'l1', effectCardId: 'e1', tarotId: 't1' }))
    const resolved = expectOk(applyAction(opened, { type: 'PASS_TRIGGER_WINDOW', playerId: 'p2' }))
    expect(resolved.phase).toBe('build')
    expect(resolved.structures.find((s) => s.id === 's1')!.level).toBe(4)
    // Bob still holds his Emperor — he chose not to use it.
    expect(resolved.players[1].heldMajorArcana).toHaveLength(1)
  })

  it('rejects a response from anyone other than the current head of the queue', () => {
    const emperorCard = { kind: 'major' as const, instanceId: 'emp-1', id: 'EMPEROR' as const }
    const state = makeState({
      phase: 'cast',
      tarotRow: [
        { kind: 'minor', instanceId: 't1', suit: 'Cups', rank: '7', operandA: { kind: 'terrain', value: 'Forests' }, operandB: { kind: 'structureType', value: 'Tower' } },
      ],
      players: [
        { id: 'p1', name: 'Alice', isAI: false, logicHand: [{ instanceId: 'l1', kind: 'A' }], effectHand: [{ instanceId: 'e1', kind: 'UPGRADE_1' }], heldMajorArcana: [] },
        { id: 'p2', name: 'Bob', isAI: false, logicHand: [], effectHand: [], heldMajorArcana: [emperorCard] },
      ],
    })
    const opened = expectOk(applyAction(state, { type: 'CAST_SPELL', playerId: 'p1', logicCardId: 'l1', effectCardId: 'e1', tarotId: 't1' }))
    expect(expectErr(applyAction(opened, { type: 'PASS_TRIGGER_WINDOW', playerId: 'p1' }))).toMatch(/not your turn/i)
  })
})

describe('High Priestess build boost', () => {
  const priestess = { kind: 'major' as const, instanceId: 'hp-1', id: 'HIGH_PRIESTESS' as const }
  const trio: Structure[] = [
    { id: 'pool', type: 'Pool', owner: 'p1', hexId: 'hex-1', level: 2, fortressed: false },
    { id: 'pyr', type: 'Pyramid', owner: 'p1', hexId: 'hex-1', level: 1, fortressed: false },
    { id: 'tow', type: 'Tower', owner: 'p1', hexId: 'hex-1', level: 1, fortressed: false },
  ]
  function stateWithPriestess(overrides: Partial<GameState> = {}): GameState {
    return makeState({
      phase: 'build',
      structures: trio,
      players: [
        { id: 'p1', name: 'Alice', isAI: false, logicHand: [], effectHand: [], heldMajorArcana: [priestess] },
        { id: 'p2', name: 'Bob', isAI: false, logicHand: [], effectHand: [], heldMajorArcana: [] },
      ],
      ...overrides,
    })
  }

  it('boosts a basic structure to level 3, consuming the held card', () => {
    const boosted = expectOk(
      applyAction(stateWithPriestess(), {
        type: 'BUILD_STRUCTURE',
        playerId: 'p1',
        hexId: 'hex-2',
        structureType: 'Tower',
        playHighPriestessCardId: 'hp-1',
      }),
    )
    const newTower = boosted.structures.find((s) => s.hexId === 'hex-2')!
    expect(newTower.level).toBe(3)
    expect(boosted.players[0].heldMajorArcana).toHaveLength(0)
  })

  it('boosts a Pool straight to its own max of 3', () => {
    const boosted = expectOk(
      applyAction(stateWithPriestess(), {
        type: 'BUILD_STRUCTURE',
        playerId: 'p1',
        hexId: 'hex-2',
        structureType: 'Pool',
        playHighPriestessCardId: 'hp-1',
      }),
    )
    const newPool = boosted.structures.find((s) => s.hexId === 'hex-2')!
    expect(newPool.level).toBe(3)
  })

  it('boosts a Fortress build to level 2, not 3', () => {
    const boostedFortress = expectOk(
      applyAction(stateWithPriestess(), {
        type: 'BUILD_STRUCTURE',
        playerId: 'p1',
        hexId: 'hex-1',
        structureType: 'Fortress',
        playHighPriestessCardId: 'hp-1',
      }),
    )
    const fortress = boostedFortress.structures.find((s) => s.type === 'Fortress')!
    expect(fortress.level).toBe(2)
  })

  it('rejects claiming to hold the High Priestess when you do not', () => {
    const state = makeState({ phase: 'build' })
    expect(
      expectErr(applyAction(state, { type: 'BUILD_STRUCTURE', playerId: 'p1', hexId: 'hex-1', structureType: 'Pool', playHighPriestessCardId: 'ghost' })),
    ).toMatch(/not holding/)
  })
})

describe('SET_ASSISTANCE_LEVEL action', () => {
  it('updates the assistanceLevel of a valid player', () => {
    let state = makeState({})
    expect(state.players[0].assistanceLevel).toBeUndefined()

    state = expectOk(applyAction(state, {
      type: 'SET_ASSISTANCE_LEVEL',
      playerId: 'p1',
      assistanceLevel: 'full'
    }))

    expect(state.players[0].assistanceLevel).toBe('full')
  })

  it('rejects updating an invalid/unknown player id', () => {
    const state = makeState({})
    expectErr(applyAction(state, {
      type: 'SET_ASSISTANCE_LEVEL',
      playerId: 'invalid-id',
      assistanceLevel: 'full'
    }))
  })
})
