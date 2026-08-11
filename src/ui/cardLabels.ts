import type { EffectCardId, LogicCardId } from '../engine/types/cards'

export const LOGIC_CARD_LABELS: Record<LogicCardId, string> = {
  A: 'A',
  B: 'B',
  NOT_A: 'NOT A',
  NOT_B: 'NOT B',
  A_AND_B: 'A AND B',
  A_OR_B: 'A OR B',
  A_NOT_B: 'A NOT B',
  B_NOT_A: 'B NOT A',
  A_NOR_B: 'A NOR B',
  A_XOR_B: 'A XOR B',
}

export const EFFECT_CARD_LABELS: Record<EffectCardId, string> = {
  UPGRADE_1: 'Upgrade 1',
  UPGRADE_2: 'Upgrade 2',
  UPGRADE_3: 'Upgrade 3',
  DOWNGRADE_1: 'Downgrade 1',
  DOWNGRADE_2: 'Downgrade 2',
  DOWNGRADE_3: 'Downgrade 3',
  MAXIMIZE: 'Maximize',
  RANDOMIZE: 'Randomize',
  COMBO: 'Combo',
}
