import type { EffectCard } from '../../../engine/types/cards'
import { EFFECT_CARD_LABELS } from '../../cardLabels'

export function EffectCardHand({
  cards,
  selectedId,
  onSelect,
}: {
  cards: EffectCard[]
  selectedId: string | null
  onSelect: (instanceId: string) => void
}) {
  return (
    <div className="card-hand">
      <div className="card-hand-label">Effect Cards</div>
      <div className="card-hand-row">
        {cards.map((card) => (
          <button
            key={card.instanceId}
            className={`card-button card-effect ${selectedId === card.instanceId ? 'is-selected' : ''}`}
            onClick={() => onSelect(card.instanceId)}
          >
            {EFFECT_CARD_LABELS[card.kind]}
          </button>
        ))}
      </div>
    </div>
  )
}
