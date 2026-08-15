import type { EffectCard } from '../../../engine/types/cards'
import { EFFECT_CARD_LABELS } from '../../cardLabels'
import { EFFECT_FRAME, effectCaptionStyle } from '../../cardArt'
import { GameCard, CARD_WIDTH, CARD_HEIGHT } from './GameCard'

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
          <GameCard
            key={card.instanceId}
            frame={EFFECT_FRAME}
            label={EFFECT_CARD_LABELS[card.kind]}
            captionStyle={effectCaptionStyle(card.kind, CARD_WIDTH, CARD_HEIGHT)}
            selected={selectedId === card.instanceId}
            onClick={() => onSelect(card.instanceId)}
          />
        ))}
      </div>
    </div>
  )
}
