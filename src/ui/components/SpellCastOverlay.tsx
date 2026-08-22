import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGameEngine } from '../hooks/useGameEngine'
import { GameCard } from './Hand/GameCard'
import { LOGIC_FRAME, EFFECT_FRAME, logicArtStyle, logicCaptionStyle, effectCaptionStyle } from '../cardArt'
import { CARD_WIDTH, CARD_HEIGHT } from './Hand/GameCard'

const DISMISS_MS = 5000
const FADE_MS = 400

export function SpellCastOverlay() {
  const { spellAnimation, clearSpellAnimation, state } = useGameEngine()
  const [exiting, setExiting] = useState(false)

  const dismiss = useCallback(() => {
    setExiting(true)
    setTimeout(clearSpellAnimation, FADE_MS)
  }, [clearSpellAnimation])

  useEffect(() => {
    if (!spellAnimation) return
    setExiting(false)
    const timer = setTimeout(dismiss, DISMISS_MS)
    return () => clearTimeout(timer)
  }, [spellAnimation, dismiss])

  useEffect(() => {
    if (!spellAnimation) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [spellAnimation, dismiss])

  if (!spellAnimation || !state) return null

  const caster = state.players.find((p) => p.id === spellAnimation.casterId)
  const casterName = caster?.name ?? 'Player'

  const casterNet = spellAnimation.playerDeltas[spellAnimation.casterId] ?? 0
  const opponentEntries = Object.entries(spellAnimation.playerDeltas).filter(
    ([id]) => id !== spellAnimation.casterId,
  )
  const opponentNet = opponentEntries.reduce((sum, [, delta]) => sum + delta, 0)
  const relativeNet = casterNet - opponentNet

  return createPortal(
    <div
      className={`spell-cast-overlay ${exiting ? 'is-exiting' : ''}`}
      onClick={dismiss}
      role="dialog"
      aria-label="Spell cast summary"
    >
      <div className="spell-cast-content" onClick={(e) => e.stopPropagation()}>
        <div className="spell-cast-header">
          <span className="spell-caster-name">{casterName}</span> cast a spell
        </div>

        <div className="spell-cards-display">
          {spellAnimation.tarotCard && (
            <div className="spell-card-slot">
              <img
                className="spell-card-art spell-card-tarot"
                src={spellAnimation.tarotCard.artUrl}
                alt={spellAnimation.tarotCard.label}
                draggable={false}
              />
              <div className="spell-card-label">{spellAnimation.tarotCard.label}</div>
            </div>
          )}
          {spellAnimation.logicCard && (
            <div className="spell-card-slot">
              <GameCard
                frame={LOGIC_FRAME}
                label={spellAnimation.logicCard.label}
                artStyle={logicArtStyle(spellAnimation.logicCard.kind, CARD_WIDTH, CARD_HEIGHT)}
                captionStyle={logicCaptionStyle(spellAnimation.logicCard.kind, CARD_WIDTH, CARD_HEIGHT)}
                selected={false}
                onClick={() => {}}
              />
              <div className="spell-card-label">{spellAnimation.logicCard.label}</div>
            </div>
          )}
          {spellAnimation.effectCard && (
            <div className="spell-card-slot">
              <GameCard
                frame={EFFECT_FRAME}
                label={spellAnimation.effectCard.label}
                captionStyle={effectCaptionStyle(spellAnimation.effectCard.kind, CARD_WIDTH, CARD_HEIGHT)}
                selected={false}
                onClick={() => {}}
              />
              <div className="spell-card-label">{spellAnimation.effectCard.label}</div>
            </div>
          )}
        </div>

        <div className="spell-summary">
          <div className="spell-summary-column">
            <div className="spell-summary-header">{casterName}</div>
            <div className={`spell-summary-net ${casterNet >= 0 ? 'delta-positive' : 'delta-negative'}`}>
              {casterNet >= 0 ? '+' : ''}{casterNet}
            </div>
          </div>
          <div className="spell-summary-divider" />
          <div className="spell-summary-column">
            <div className="spell-summary-header">Others</div>
            <div className={`spell-summary-net ${opponentNet >= 0 ? 'delta-positive' : 'delta-negative'}`}>
              {opponentNet >= 0 ? '+' : ''}{opponentNet}
            </div>
          </div>
          <div className="spell-summary-divider" />
          <div className="spell-summary-column">
            <div className="spell-summary-header">Net</div>
            <div className={`spell-summary-net ${relativeNet >= 0 ? 'delta-positive' : 'delta-negative'}`}>
              {relativeNet >= 0 ? '+' : ''}{relativeNet}
            </div>
          </div>
        </div>

        <div className="spell-cast-hint">Click or press Esc to dismiss</div>
      </div>
    </div>,
    document.body,
  )
}
