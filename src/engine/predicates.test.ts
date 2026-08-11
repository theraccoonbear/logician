import { describe, expect, it } from 'vitest'
import { LOGIC_PREDICATES, getLogicMatcher, matchesOperand } from './predicates'
import type { Structure } from './types/structure'
import type { Hex } from './board'

const TRUE = () => true
const FALSE = () => false

describe('LOGIC_PREDICATES truth table', () => {
  const cases: Array<[keyof typeof LOGIC_PREDICATES, boolean, boolean, boolean]> = [
    ['A', true, true, true],
    ['A', true, false, true],
    ['A', false, true, false],
    ['A', false, false, false],
    ['B', true, true, true],
    ['B', false, true, true],
    ['B', true, false, false],
    ['NOT_A', true, true, false],
    ['NOT_A', false, true, true],
    ['NOT_B', true, true, false],
    ['NOT_B', true, false, true],
    ['A_AND_B', true, true, true],
    ['A_AND_B', true, false, false],
    ['A_AND_B', false, true, false],
    ['A_AND_B', false, false, false],
    ['A_OR_B', true, false, true],
    ['A_OR_B', false, true, true],
    ['A_OR_B', true, true, true],
    ['A_OR_B', false, false, false],
    ['A_NOT_B', true, false, true],
    ['A_NOT_B', true, true, false],
    ['A_NOT_B', false, true, false],
    ['B_NOT_A', false, true, true],
    ['B_NOT_A', true, true, false],
    ['B_NOT_A', true, false, false],
    ['A_NOR_B', false, false, true],
    ['A_NOR_B', true, false, false],
    ['A_NOR_B', false, true, false],
    ['A_NOR_B', true, true, false],
    ['A_XOR_B', true, false, true],
    ['A_XOR_B', false, true, true],
    ['A_XOR_B', true, true, false],
    ['A_XOR_B', false, false, false],
  ]

  it.each(cases)('%s with a=%s b=%s => %s', (kind, a, b, expected) => {
    const matcher = LOGIC_PREDICATES[kind](a ? TRUE : FALSE, b ? TRUE : FALSE)
    expect(matcher(null as unknown as Structure, null as unknown as Hex)).toBe(expected)
  })
})

describe('matchesOperand', () => {
  const hex: Hex = { id: 'hex-1', terrain: 'Forests' }
  const structure: Structure = { id: 's1', type: 'Pool', owner: 'p1', hexId: 'hex-1', level: 3, fortressed: false }

  it('matches terrain operands against the hex', () => {
    expect(matchesOperand({ kind: 'terrain', value: 'Forests' }, structure, hex)).toBe(true)
    expect(matchesOperand({ kind: 'terrain', value: 'Swamps' }, structure, hex)).toBe(false)
  })

  it('matches structureType operands against the structure', () => {
    expect(matchesOperand({ kind: 'structureType', value: 'Pool' }, structure, hex)).toBe(true)
    expect(matchesOperand({ kind: 'structureType', value: 'Tower' }, structure, hex)).toBe(false)
  })

  it('matches level operands against the structure', () => {
    expect(matchesOperand({ kind: 'level', value: 3 }, structure, hex)).toBe(true)
    expect(matchesOperand({ kind: 'level', value: 2 }, structure, hex)).toBe(false)
  })
})

describe('getLogicMatcher integration', () => {
  const hex: Hex = { id: 'hex-1', terrain: 'Forests' }
  const pool: Structure = { id: 's1', type: 'Pool', owner: 'p1', hexId: 'hex-1', level: 3, fortressed: false }

  it('combines a real operand pair through A_AND_B', () => {
    const matcher = getLogicMatcher(
      'A_AND_B',
      { kind: 'terrain', value: 'Forests' },
      { kind: 'structureType', value: 'Pool' },
    )
    expect(matcher(pool, hex)).toBe(true)
  })

  it('combines a real operand pair through A_XOR_B when both match', () => {
    const matcher = getLogicMatcher(
      'A_XOR_B',
      { kind: 'terrain', value: 'Forests' },
      { kind: 'structureType', value: 'Pool' },
    )
    expect(matcher(pool, hex)).toBe(false)
  })
})
