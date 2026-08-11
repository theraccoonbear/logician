import type { LogicCard } from '../../../engine/types/cards'
import { LOGIC_CARD_LABELS } from '../../cardLabels'

export function LogicCardHand({
  cards,
  selectedId,
  onSelect,
}: {
  cards: LogicCard[]
  selectedId: string | null
  onSelect: (instanceId: string) => void
}) {
  return (
    <div className="card-hand">
      <div className="card-hand-label">Logic Cards</div>
      <div className="card-hand-row">
        {cards.map((card) => (
          <button
            key={card.instanceId}
            className={`card-button card-logic ${selectedId === card.instanceId ? 'is-selected' : ''}`}
            onClick={() => onSelect(card.instanceId)}
          >
            {LOGIC_CARD_LABELS[card.kind]}
          </button>
        ))}
      </div>
    </div>
  )
}
