import type { LogicCard } from '../../../engine/types/cards'
import { LOGIC_CARD_LABELS } from '../../cardLabels'
import { LOGIC_FRAME, logicArtStyle, logicCaptionStyle } from '../../cardArt'
import { GameCard, CARD_WIDTH, CARD_HEIGHT } from './GameCard'

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
          <GameCard
            key={card.instanceId}
            cardId={card.instanceId}
            cardType="logic"
            frame={LOGIC_FRAME}
            label={LOGIC_CARD_LABELS[card.kind]}
            artStyle={logicArtStyle(card.kind, CARD_WIDTH, CARD_HEIGHT)}
            captionStyle={logicCaptionStyle(card.kind, CARD_WIDTH, CARD_HEIGHT)}
            selected={selectedId === card.instanceId}
            onClick={() => onSelect(card.instanceId)}
          />
        ))}
      </div>
    </div>
  )
}
