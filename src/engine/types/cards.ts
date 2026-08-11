export type LogicCardId =
  | 'A'
  | 'B'
  | 'NOT_A'
  | 'NOT_B'
  | 'A_AND_B'
  | 'A_OR_B'
  | 'A_NOT_B'
  | 'B_NOT_A'
  | 'A_NOR_B'
  | 'A_XOR_B'

export const LOGIC_CARD_IDS: readonly LogicCardId[] = [
  'A',
  'B',
  'NOT_A',
  'NOT_B',
  'A_AND_B',
  'A_OR_B',
  'A_NOT_B',
  'B_NOT_A',
  'A_NOR_B',
  'A_XOR_B',
]

export interface LogicCard {
  instanceId: string
  kind: LogicCardId
}

export type EffectCardId =
  | 'UPGRADE_1'
  | 'UPGRADE_2'
  | 'UPGRADE_3'
  | 'DOWNGRADE_1'
  | 'DOWNGRADE_2'
  | 'DOWNGRADE_3'
  | 'MAXIMIZE'
  | 'RANDOMIZE'
  | 'COMBO'

export type Rarity = 'common' | 'uncommon' | 'rare'

// Copy counts per Effect Card kind, driven by the designer's stated rarity tiers.
// No exact counts were specified — these are a reasonable placeholder split to
// tune once the game is playable (see plan's "Remaining Assumptions").
export const EFFECT_CARD_COPIES: Record<EffectCardId, number> = {
  UPGRADE_1: 6,
  DOWNGRADE_1: 6,
  UPGRADE_2: 4,
  DOWNGRADE_2: 4,
  RANDOMIZE: 4,
  UPGRADE_3: 2,
  DOWNGRADE_3: 2,
  MAXIMIZE: 2,
  COMBO: 2,
}

export const EFFECT_CARD_IDS: readonly EffectCardId[] = Object.keys(
  EFFECT_CARD_COPIES,
) as EffectCardId[]

export interface EffectCard {
  instanceId: string
  kind: EffectCardId
}

// Copy counts per Logic Card kind — all ten treated equally (see plan's "Remaining Assumptions").
export const LOGIC_CARD_COPIES = 4

// Starting (and steady-state) hand size for both Logic and Effect cards, per the ruleset's setup step.
export const HAND_SIZE = 3
