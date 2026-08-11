import type { StructureType } from './structure'
import type { Suit, TerrainType } from './terrain'
import { SUIT_TERRAIN } from './terrain'

export type MinorNumberRank = 'Ace' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
export type CourtRank = 'Page' | 'Knight' | 'Queen' | 'King'
export type MinorRank = MinorNumberRank | CourtRank

export const MINOR_RANKS: readonly MinorRank[] = [
  'Ace',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'Page',
  'Knight',
  'Queen',
  'King',
]

export type OperandKind = 'terrain' | 'structureType' | 'level'

export interface Operand {
  kind: OperandKind
  value: TerrainType | StructureType | number
}

export interface MinorArcanaCard {
  kind: 'minor'
  instanceId: string
  suit: Suit
  rank: MinorRank
  operandA: Operand
  operandB: Operand
}

export const MAJOR_ARCANA_IDS = [
  'FOOL',
  'MAGICIAN',
  'HIGH_PRIESTESS',
  'EMPRESS',
  'EMPEROR',
  'HIEROPHANT',
  'LOVERS',
  'CHARIOT',
  'STRENGTH',
  'HERMIT',
  'WHEEL',
  'JUSTICE',
  'HANGED_MAN',
  'DEATH',
  'TEMPERANCE',
  'DEVIL',
  'TOWER',
  'STAR',
  'MOON',
  'SUN',
  'JUDGEMENT',
  'WORLD',
] as const

export type MajorArcanaId = (typeof MAJOR_ARCANA_IDS)[number]

export interface MajorArcanaCard {
  kind: 'major'
  instanceId: string
  id: MajorArcanaId
}

export type TarotCard = MinorArcanaCard | MajorArcanaCard

const NUMBER_RANK_VALUE: Record<MinorNumberRank, number> = {
  Ace: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
}

const RANK_SEVEN_TO_TEN_STRUCTURE: Record<string, StructureType> = {
  '7': 'Pool',
  '8': 'Pyramid',
  '9': 'Tower',
  '10': 'Fortress',
}

const COURT_LEVEL: Record<CourtRank, number> = {
  Page: 1,
  Knight: 2,
  Queen: 3,
  King: 4,
}

// Per fig. 2: court-card structure type is per-suit, and Swords notably shifts
// from Fortress (Page/Knight) to Tower (Queen/King) — not a uniform formula.
const COURT_STRUCTURE: Record<Suit, Record<CourtRank, StructureType>> = {
  Wands: { Page: 'Pyramid', Knight: 'Pyramid', Queen: 'Pyramid', King: 'Pyramid' },
  Cups: { Page: 'Pool', Knight: 'Pool', Queen: 'Pool', King: 'Pool' },
  Swords: { Page: 'Fortress', Knight: 'Fortress', Queen: 'Tower', King: 'Tower' },
  Pentacles: { Page: 'Tower', Knight: 'Tower', Queen: 'Tower', King: 'Tower' },
}

const COURT_RANKS: readonly CourtRank[] = ['Page', 'Knight', 'Queen', 'King']

function isCourtRank(rank: MinorRank): rank is CourtRank {
  return (COURT_RANKS as readonly string[]).includes(rank)
}

/** Derives the (A, B) operand pair for a Minor Arcana card per fig. 2. */
export function deriveMinorOperands(suit: Suit, rank: MinorRank): { operandA: Operand; operandB: Operand } {
  const terrain = SUIT_TERRAIN[suit]

  if (isCourtRank(rank)) {
    return {
      operandA: { kind: 'structureType', value: COURT_STRUCTURE[suit][rank] },
      operandB: { kind: 'level', value: COURT_LEVEL[rank] },
    }
  }

  const numberRank = rank as MinorNumberRank
  const numericValue = NUMBER_RANK_VALUE[numberRank]

  if (numericValue >= 7) {
    return {
      operandA: { kind: 'terrain', value: terrain },
      operandB: { kind: 'structureType', value: RANK_SEVEN_TO_TEN_STRUCTURE[numberRank] },
    }
  }

  return {
    operandA: { kind: 'terrain', value: terrain },
    operandB: { kind: 'level', value: numericValue },
  }
}
