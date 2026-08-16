import type { TarotCard } from '../../../engine/types/tarot'
import { TarotCardView } from './TarotCardView'

export function TarotRow({
  cards,
  selectedId,
  onSelect,
  activeTarotId,
  isDragging,
}: {
  cards: TarotCard[]
  selectedId: string | null
  onSelect: (instanceId: string) => void
  activeTarotId?: string | null
  isDragging?: boolean
}) {
  return (
    <div className="tarot-row">
      <div className="tarot-row-cards">
        {cards.map((tarot) => {
          const isDragSource = Boolean(isDragging && activeTarotId && activeTarotId === tarot.instanceId)
          const isPoofed = Boolean(isDragging && activeTarotId && activeTarotId !== tarot.instanceId)
          return (
            <TarotCardView
              key={tarot.instanceId}
              tarot={tarot}
              selected={selectedId === tarot.instanceId}
              onSelect={onSelect}
              isPoofed={isPoofed}
              isDragSource={isDragSource}
            />
          )
        })}
      </div>
    </div>
  )
}
