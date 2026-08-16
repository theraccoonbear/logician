import { createPortal } from 'react-dom'
import type { LogicCard } from '../../../engine/types/cards'
import type { TarotCard } from '../../../engine/types/tarot'
import { LOGIC_FRAME, logicArtStyle, logicCaptionStyle } from '../../cardArt'
import { LOGIC_CARD_LABELS } from '../../cardLabels'
import { CARD_HEIGHT, CARD_WIDTH, GameCard } from '../Hand/GameCard'
import { TarotCardView } from '../TarotRow/TarotCardView'

export interface CastingGestureOverlayProps {
  isDragging: boolean
  activeTarotCard: TarotCard | null
  activeLogicCard: LogicCard | null
  pointerPos: { x: number; y: number }
  points: Array<{ x: number; y: number; t: number }>
}

export function CastingGestureOverlay({
  isDragging,
  activeTarotCard,
  activeLogicCard,
  pointerPos,
  points,
}: CastingGestureOverlayProps) {
  if (!isDragging) return null

  const pathD =
    points.length >= 2
      ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')
      : ''

  const overlayContent = (
    <div className="gesture-overlay-root">
      <svg className="gesture-trail-svg">
        <defs>
          <linearGradient id="trailGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#67e8f9" stopOpacity="1" />
          </linearGradient>
          <filter id="trailGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="url(#trailGradient)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#trailGlow)"
          />
        )}
        <circle
          cx={pointerPos.x}
          cy={pointerPos.y}
          r="8"
          fill="#67e8f9"
          filter="url(#trailGlow)"
        />
      </svg>

      {activeTarotCard && activeLogicCard ? (
        <div
          className="gesture-floating-cards"
          style={{
            left: `${pointerPos.x}px`,
            top: `${pointerPos.y}px`,
          }}
        >
          <div className="gesture-card-tarot">
            <TarotCardView tarot={activeTarotCard} selected={false} onSelect={() => {}} />
          </div>
          <div className="gesture-card-logic">
            <GameCard
              cardId={activeLogicCard.instanceId}
              cardType="logic"
              frame={LOGIC_FRAME}
              label={LOGIC_CARD_LABELS[activeLogicCard.kind]}
              artStyle={logicArtStyle(activeLogicCard.kind, CARD_WIDTH, CARD_HEIGHT)}
              captionStyle={logicCaptionStyle(activeLogicCard.kind, CARD_WIDTH, CARD_HEIGHT)}
              selected={false}
              onClick={() => {}}
            />
          </div>
        </div>
      ) : activeTarotCard ? (
        <div
          className="gesture-floating-card"
          style={{
            left: `${pointerPos.x}px`,
            top: `${pointerPos.y}px`,
          }}
        >
          <TarotCardView tarot={activeTarotCard} selected={false} onSelect={() => {}} />
        </div>
      ) : activeLogicCard ? (
        <div
          className="gesture-floating-card"
          style={{
            left: `${pointerPos.x}px`,
            top: `${pointerPos.y}px`,
          }}
        >
          <GameCard
            cardId={activeLogicCard.instanceId}
            cardType="logic"
            frame={LOGIC_FRAME}
            label={LOGIC_CARD_LABELS[activeLogicCard.kind]}
            artStyle={logicArtStyle(activeLogicCard.kind, CARD_WIDTH, CARD_HEIGHT)}
            captionStyle={logicCaptionStyle(activeLogicCard.kind, CARD_WIDTH, CARD_HEIGHT)}
            selected={false}
            onClick={() => {}}
          />
        </div>
      ) : null}
    </div>
  )

  return createPortal(overlayContent, document.body)
}
