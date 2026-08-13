import { IMPLEMENTED_MAJOR_ARCANA_IDS } from '../../../engine/majorArcana/registry'
import { isHoldCard } from '../../../engine/triggers'
import type { TarotCard } from '../../../engine/types/tarot'
import { MAJOR_ARCANA_DESCRIPTIONS } from '../../majorArcanaDescriptions'
import { describeMajorArcana, describeOperand } from '../../operandLabels'
import { tarotArtUrl } from '../../tarotArt'

export function TarotCardView({
  tarot,
  selected,
  onSelect,
}: {
  tarot: TarotCard
  selected: boolean
  onSelect: (instanceId: string) => void
}) {
  const art = tarotArtUrl(tarot)

  if (tarot.kind === 'major') {
    const holdable = isHoldCard(tarot.id) || tarot.id === 'HIGH_PRIESTESS'
    const implemented = holdable || IMPLEMENTED_MAJOR_ARCANA_IDS.has(tarot.id)
    const description = MAJOR_ARCANA_DESCRIPTIONS[tarot.id]
    return (
      <button
        className={`tarot-card tarot-major ${selected ? 'is-selected' : ''} ${!implemented ? 'is-disabled' : ''}`}
        disabled={!implemented}
        title={description}
        onClick={() => onSelect(tarot.instanceId)}
      >
        <img className="tarot-art" src={art} alt={describeMajorArcana(tarot.id)} />
        <div className="tarot-name">{describeMajorArcana(tarot.id)}</div>
        <p className="tarot-major-description">{description}</p>
        <div className="tarot-note">{holdable ? 'hold for later ↓' : implemented ? 'cast below ↓' : 'coming soon'}</div>
      </button>
    )
  }

  return (
    <button
      className={`tarot-card tarot-minor ${selected ? 'is-selected' : ''}`}
      onClick={() => onSelect(tarot.instanceId)}
    >
      <img className="tarot-art" src={art} alt={`${tarot.rank} of ${tarot.suit}`} />
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
