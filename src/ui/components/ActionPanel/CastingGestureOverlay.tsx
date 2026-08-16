import { createPortal } from 'react-dom'
import type { TarotCard } from '../../../engine/types/tarot'
import { TarotCardView } from '../TarotRow/TarotCardView'

export interface CastingGestureOverlayProps {
  isDragging: boolean
  activeTarotCard: TarotCard | null
  pointerPos: { x: number; y: number }
  points: Array<{ x: number; y: number; t: number }>
}

export function CastingGestureOverlay({
  isDragging,
  activeTarotCard,
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
            <stop offset="0%" stopColor="#ff3b9a" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="1" />
          </linearGradient>
          <filter id="trailGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
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
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#trailGlow)"
          />
        )}
        <circle
          cx={pointerPos.x}
          cy={pointerPos.y}
          r="9"
          fill="#ffffff"
          filter="url(#trailGlow)"
        />
      </svg>

      {activeTarotCard && (
        <div
          className="gesture-floating-card"
          style={{
            left: `${pointerPos.x}px`,
            top: `${pointerPos.y}px`,
          }}
        >
          <TarotCardView tarot={activeTarotCard} selected={false} onSelect={() => {}} />
        </div>
      )}
    </div>
  )

  return createPortal(overlayContent, document.body)
}
