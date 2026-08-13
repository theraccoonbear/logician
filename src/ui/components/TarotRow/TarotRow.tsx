import type { TarotCard } from '../../../engine/types/tarot'
import { TarotCardView } from './TarotCardView'

export function TarotRow({
  cards,
  selectedId,
  onSelect,
}: {
  cards: TarotCard[]
  selectedId: string | null
  onSelect: (instanceId: string) => void
}) {
  return (
    <div className="tarot-row">
      <div className="tarot-row-cards">
        {cards.map((tarot) => (
          <TarotCardView key={tarot.instanceId} tarot={tarot} selected={selectedId === tarot.instanceId} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}
