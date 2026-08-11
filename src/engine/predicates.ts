import type { Hex } from './board'
import type { LogicCardId } from './types/cards'
import type { Structure } from './types/structure'
import type { Operand } from './types/tarot'

export type Matcher = (structure: Structure, hex: Hex) => boolean

export function matchesOperand(operand: Operand, structure: Structure, hex: Hex): boolean {
  switch (operand.kind) {
    case 'terrain':
      return hex.terrain === operand.value
    case 'structureType':
      return structure.type === operand.value
    case 'level':
      return structure.level === operand.value
  }
}

type LogicCombinator = (a: Matcher, b: Matcher) => Matcher

export const LOGIC_PREDICATES: Record<LogicCardId, LogicCombinator> = {
  A: (a) => a,
  B: (_a, b) => b,
  NOT_A: (a) => (s, h) => !a(s, h),
  NOT_B: (_a, b) => (s, h) => !b(s, h),
  A_AND_B: (a, b) => (s, h) => a(s, h) && b(s, h),
  A_OR_B: (a, b) => (s, h) => a(s, h) || b(s, h),
  A_NOT_B: (a, b) => (s, h) => a(s, h) && !b(s, h),
  B_NOT_A: (a, b) => (s, h) => b(s, h) && !a(s, h),
  A_NOR_B: (a, b) => (s, h) => !a(s, h) && !b(s, h),
  A_XOR_B: (a, b) => (s, h) => a(s, h) !== b(s, h),
}

/** Builds the combined matcher for a Logic Card given the two tarot-derived operands. */
export function getLogicMatcher(logicCardId: LogicCardId, operandA: Operand, operandB: Operand): Matcher {
  const a: Matcher = (s, h) => matchesOperand(operandA, s, h)
  const b: Matcher = (s, h) => matchesOperand(operandB, s, h)
  return LOGIC_PREDICATES[logicCardId](a, b)
}
