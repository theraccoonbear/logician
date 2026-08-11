import type { Operand } from '../engine/types/tarot'

export function describeOperand(operand: Operand): string {
  switch (operand.kind) {
    case 'terrain':
      return String(operand.value)
    case 'structureType':
      return String(operand.value)
    case 'level':
      return `Level ${operand.value}`
  }
}

const MAJOR_ARCANA_LABELS: Record<string, string> = {
  FOOL: 'The Fool',
  MAGICIAN: 'The Magician',
  HIGH_PRIESTESS: 'The High Priestess',
  EMPRESS: 'The Empress',
  EMPEROR: 'The Emperor',
  HIEROPHANT: 'The Hierophant',
  LOVERS: 'The Lovers',
  CHARIOT: 'The Chariot',
  STRENGTH: 'Strength',
  HERMIT: 'The Hermit',
  WHEEL: 'Wheel of Fortune',
  JUSTICE: 'Justice',
  HANGED_MAN: 'The Hanged Man',
  DEATH: 'Death',
  TEMPERANCE: 'Temperance',
  DEVIL: 'The Devil',
  TOWER: 'The Tower',
  STAR: 'The Star',
  MOON: 'The Moon',
  SUN: 'The Sun',
  JUDGEMENT: 'Judgement',
  WORLD: 'The World',
}

export function describeMajorArcana(id: string): string {
  return MAJOR_ARCANA_LABELS[id] ?? id
}
