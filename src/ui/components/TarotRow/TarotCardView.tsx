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
  isPoofed = false,
  isDragSource = false,
  artOnly = false,
}: {
  tarot: TarotCard
  selected: boolean
  onSelect: (instanceId: string) => void
  isPoofed?: boolean
  isDragSource?: boolean
  artOnly?: boolean
}) {
  const art = tarotArtUrl(tarot)

  if (artOnly) {
    return (
      <button
        className={`tarot-card ${tarot.kind === 'major' ? 'tarot-major' : 'tarot-minor'} tarot-art-only`}
        data-tarot-id={tarot.instanceId}
        onClick={() => onSelect(tarot.instanceId)}
      >
        <img className="tarot-art" src={art} alt="" draggable={false} />
      </button>
    )
  }

  if (tarot.kind === 'major') {
    const holdable = isHoldCard(tarot.id) || tarot.id === 'HIGH_PRIESTESS'
    const implemented = holdable || IMPLEMENTED_MAJOR_ARCANA_IDS.has(tarot.id)
    const description = MAJOR_ARCANA_DESCRIPTIONS[tarot.id]
    return (
      <button
        className={`tarot-card tarot-major ${selected ? 'is-selected' : ''} ${!implemented ? 'is-disabled' : ''} ${isPoofed ? 'is-poofed' : ''} ${isDragSource ? 'is-drag-source' : ''}`}
        disabled={!implemented}
        title={description}
        data-tarot-id={tarot.instanceId}
        data-tarot-kind="major"
        onClick={() => onSelect(tarot.instanceId)}
      >
        <img className="tarot-art" src={art} alt={describeMajorArcana(tarot.id)} draggable={false} />
        <div className="tarot-name">{describeMajorArcana(tarot.id)}</div>
        <p className="tarot-major-description">{description}</p>
        <div className="tarot-note">{holdable ? 'hold for later ↓' : implemented ? 'cast below ↓' : 'coming soon'}</div>
      </button>
    )
  }

  return (
    <button
      className={`tarot-card tarot-minor ${selected ? 'is-selected' : ''} ${isPoofed ? 'is-poofed' : ''} ${isDragSource ? 'is-drag-source' : ''}`}
      data-tarot-id={tarot.instanceId}
      data-tarot-kind="minor"
      onClick={() => onSelect(tarot.instanceId)}
    >
      <img className="tarot-art" src={art} alt={`${tarot.rank} of ${tarot.suit}`} draggable={false} />
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
