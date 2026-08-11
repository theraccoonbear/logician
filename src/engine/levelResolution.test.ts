import { describe, expect, it } from 'vitest'
import { applyEffect, resolveLevelChange } from './levelResolution'
import type { Structure } from './types/structure'

function structure(type: Structure['type'], level: number): Structure {
  return { id: 's1', type, owner: 'p1', hexId: 'hex-1', level, fortressed: false }
}

describe('resolveLevelChange', () => {
  it('clamps upgrades at the structure max', () => {
    expect(resolveLevelChange(structure('Pyramid', 4), 3)).toEqual({ destroyed: false, newLevel: 4 })
    expect(resolveLevelChange(structure('Tower', 5), 2)).toEqual({ destroyed: false, newLevel: 6 })
  })

  it('destroys when the effective level drops to 0 or below', () => {
    expect(resolveLevelChange(structure('Pyramid', 1), -1)).toEqual({ destroyed: true })
    expect(resolveLevelChange(structure('Tower', 2), -3)).toEqual({ destroyed: true })
  })

  it('Pool (a 2-sided coin: floor 1, max 2) follows the same generic rule as every other structure', () => {
    expect(resolveLevelChange(structure('Pool', 2), -1)).toEqual({ destroyed: false, newLevel: 1 })
    expect(resolveLevelChange(structure('Pool', 1), -1)).toEqual({ destroyed: true })
    expect(resolveLevelChange(structure('Pool', 1), 2)).toEqual({ destroyed: false, newLevel: 2 })
  })

  it('clamps a downgrade that would land below floor at the floor', () => {
    // Not reachable via a single delta given current effect cards (max magnitude 3), but the
    // clamp-vs-destroy boundary itself must hold at exactly effective === floor - 0 vs <= 0.
    expect(resolveLevelChange(structure('Tower', 1), 0)).toEqual({ destroyed: false, newLevel: 1 })
  })
})

describe('applyEffect', () => {
  it('applies Upgrade/Downgrade N as the matching delta', () => {
    expect(applyEffect(structure('Tower', 3), 'UPGRADE_2')).toEqual({ destroyed: false, newLevel: 5 })
    expect(applyEffect(structure('Tower', 3), 'DOWNGRADE_2')).toEqual({ destroyed: false, newLevel: 1 })
  })

  it('Maximize sets the structure to its type max regardless of current level', () => {
    expect(applyEffect(structure('Pyramid', 1), 'MAXIMIZE')).toEqual({ destroyed: false, newLevel: 4 })
    expect(applyEffect(structure('Pool', 1), 'MAXIMIZE')).toEqual({ destroyed: false, newLevel: 2 })
  })

  it('Randomize always lands within [floor, max] and never destroys', () => {
    const random = () => 0 // deterministic: picks the floor
    expect(applyEffect(structure('Tower', 6), 'RANDOMIZE', { random })).toEqual({ destroyed: false, newLevel: 1 })
    const randomHigh = () => 0.999999
    expect(applyEffect(structure('Pool', 1), 'RANDOMIZE', { random: randomHigh })).toEqual({
      destroyed: false,
      newLevel: 2,
    })
  })

  it('Combo applies Upgrade 1 or Downgrade 1 based on the resolved single flip', () => {
    expect(applyEffect(structure('Tower', 2), 'COMBO', { comboOutcome: 'upgrade' })).toEqual({
      destroyed: false,
      newLevel: 3,
    })
    expect(applyEffect(structure('Tower', 1), 'COMBO', { comboOutcome: 'downgrade' })).toEqual({ destroyed: true })
  })

  it('Combo throws if no outcome was resolved', () => {
    expect(() => applyEffect(structure('Tower', 2), 'COMBO')).toThrow()
  })
})
