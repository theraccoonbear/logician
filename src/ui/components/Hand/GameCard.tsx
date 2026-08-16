import type { CSSProperties } from 'react'

// Frame art (logic.png/effect.png) is 700x1000 — fixed card size here, not fluid, since
// cardArt.ts's sprite-sheet math is computed against this exact pixel width/height rather
// than recalculated on resize.
export const CARD_WIDTH = 90
export const CARD_HEIGHT = Math.round((CARD_WIDTH * 1000) / 700)

export function GameCard({
  frame,
  label,
  artStyle,
  captionStyle,
  selected,
  onClick,
  cardId,
  cardType,
}: {
  frame: string
  label: string
  /** Large center-panel treatment — only Logic cards use this; Effect cards get just the caption. */
  artStyle?: CSSProperties
  captionStyle: CSSProperties
  selected: boolean
  onClick: () => void
  cardId?: string
  cardType?: 'logic' | 'effect'
}) {
  return (
    <button
      className={`game-card ${selected ? 'is-selected' : ''}`}
      onClick={onClick}
      title={label}
      aria-label={label}
      data-logic-id={cardType === 'logic' ? cardId : undefined}
      data-effect-id={cardType === 'effect' ? cardId : undefined}
    >
      <img className="game-card-frame" src={frame} alt="" draggable={false} />
      {artStyle && <div className="game-card-art" style={artStyle} />}
      <div className="game-card-caption" style={captionStyle} />
    </button>
  )
}
