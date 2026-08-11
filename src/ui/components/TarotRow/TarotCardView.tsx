import { IMPLEMENTED_MAJOR_ARCANA_IDS } from '../../../engine/majorArcana/registry'
import { isHoldCard } from '../../../engine/triggers'
import type { TarotCard } from '../../../engine/types/tarot'
import { MAJOR_ARCANA_DESCRIPTIONS } from '../../majorArcanaDescriptions'
import { describeMajorArcana, describeOperand } from '../../operandLabels'

export function TarotCardView({
  tarot,
  selected,
  onSelect,
}: {
  tarot: TarotCard
  selected: boolean
  onSelect: (instanceId: string) => void
}) {
  if (tarot.kind === 'major') {
    const holdable = isHoldCard(tarot.id) || tarot.id === 'HIGH_PRIESTESS'
    const implemented = holdable || IMPLEMENTED_MAJOR_ARCANA_IDS.has(tarot.id)
    const description = MAJOR_ARCANA_DESCRIPTIONS[tarot.id]
    return (
      <button className="tarot-card tarot-major is-disabled" disabled title={description}>
        <div className="tarot-name">{describeMajorArcana(tarot.id)}</div>
        <div className="tarot-major-description">{description}</div>
        <div className="tarot-note">{holdable ? 'take & hold ↓' : implemented ? 'play below ↓' : 'coming soon'}</div>
      </button>
    )
  }

  return (
    <button
      className={`tarot-card tarot-minor ${selected ? 'is-selected' : ''}`}
      onClick={() => onSelect(tarot.instanceId)}
    >
      <div className="tarot-name">
        {tarot.rank} of {tarot.suit}
      </div>
      <div className="tarot-operands">
        <span>A: {describeOperand(tarot.operandA)}</span>
        <span>B: {describeOperand(tarot.operandB)}</span>
      </div>
    </button>
  )
}
