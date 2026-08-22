import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGameEngine } from '../hooks/useGameEngine'
import { GameCard } from './Hand/GameCard'
import { LOGIC_FRAME, EFFECT_FRAME, logicArtStyle, effectArtStyle, logicCaptionStyle, effectCaptionStyle } from '../cardArt'
import { CARD_WIDTH, CARD_HEIGHT } from './Hand/GameCard'
import { structureArtUrl } from '../structureArt'
import { terrainArtUrl } from '../terrainArt'
import { getPlayerColor } from '../playerColors'
import { loadAutoDismissOverlay, saveAutoDismissOverlay } from '../persistence'
import { describeOperand } from '../operandLabels'
import type { StructureDelta } from '../GameProvider'

const DISMISS_MS = 5000
const FADE_MS = 400

export function SpellCastOverlay() {
  const { spellAnimation, clearSpellAnimation, state } = useGameEngine()
  const [exiting, setExiting] = useState(false)
  const [autoDismiss, setAutoDismiss] = useState(() => loadAutoDismissOverlay())
  const [remaining, setRemaining] = useState(DISMISS_MS)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (tickRef.current) clearInterval(tickRef.current)
    setExiting(true)
    setTimeout(clearSpellAnimation, FADE_MS)
  }, [clearSpellAnimation])

  const cancelTimers = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
  }, [])

  const startAutoTimer = useCallback(() => {
    cancelTimers()
    setRemaining(DISMISS_MS)
    const start = Date.now()
    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      const left = Math.max(0, DISMISS_MS - elapsed)
      setRemaining(left)
      if (left <= 0) {
        if (tickRef.current) clearInterval(tickRef.current)
        tickRef.current = null
      }
    }, 100)
    timerRef.current = setTimeout(dismiss, DISMISS_MS)
  }, [dismiss, cancelTimers])

  // Reset and (re)start auto-dismiss whenever spellAnimation or autoDismiss changes
  useEffect(() => {
    if (!spellAnimation) return
    setExiting(false)
    if (autoDismiss) {
      startAutoTimer()
    } else {
      cancelTimers()
      setRemaining(DISMISS_MS)
    }
    return cancelTimers
  }, [spellAnimation, autoDismiss, startAutoTimer, cancelTimers])

  // Escape key always dismisses
  useEffect(() => {
    if (!spellAnimation) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [spellAnimation, dismiss])

  const toggleAutoDismiss = () => {
    const next = !autoDismiss
    setAutoDismiss(next)
    saveAutoDismissOverlay(next)
    // If turning on, restart the timer immediately
    if (next) {
      startAutoTimer()
    } else {
      cancelTimers()
      setRemaining(DISMISS_MS)
    }
  }

  if (!spellAnimation || !state) return null

  const caster = state.players.find((p) => p.id === spellAnimation.casterId)
  const casterName = caster?.name ?? 'Player'

  const casterNet = spellAnimation.playerDeltas[spellAnimation.casterId] ?? 0
  const opponentEntries = Object.entries(spellAnimation.playerDeltas).filter(
    ([id]) => id !== spellAnimation.casterId,
  )
  const opponentNet = opponentEntries.reduce((sum, [, delta]) => sum + delta, 0)
  const relativeNet = casterNet - opponentNet

  // Group structure deltas by owner for breakdown display
  const playerIndex = (id: string) => state.players.findIndex((p) => p.id === id)

  const renderDeltaRow = (d: StructureDelta) => {
    const terrainImg = terrainArtUrl(d.terrain as Parameters<typeof terrainArtUrl>[0])
    const structImg = structureArtUrl({ type: d.structureType as Parameters<typeof structureArtUrl>[0]['type'], level: d.oldLevel })
    const isDestroyed = d.newLevel === null
    const deltaText = isDestroyed ? `destroyed (-${d.oldLevel})` : `${d.delta > 0 ? '+' : ''}${d.delta}`
    const deltaClass = d.delta > 0 ? 'delta-positive' : 'delta-negative'

    return (
      <div key={d.structureId} className="overlay-delta-row">
        <div className="overlay-delta-assets">
          <img className="overlay-delta-terrain" src={terrainImg} alt={d.terrain} title={d.terrain} />
          {structImg ? (
            <img className="overlay-delta-structure" src={structImg} alt={d.structureType} title={`${d.structureType} (Lv ${d.oldLevel})`} />
          ) : (
            <span className="overlay-delta-fallback">{d.structureType[0]}</span>
          )}
        </div>
        <span className={`overlay-delta-value ${deltaClass}`}>{deltaText}</span>
      </div>
    )
  }

  const casterChanges = spellAnimation.structureDeltas.filter((d) => d.owner === spellAnimation.casterId)
  const opponentChanges = spellAnimation.structureDeltas.filter((d) => d.owner !== spellAnimation.casterId)

  const seconds = Math.ceil(remaining / 1000)

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
              {spellAnimation.tarotCard.operandA && spellAnimation.tarotCard.operandB && (
                <div className="tarot-operands">
                  <span>A: {describeOperand(spellAnimation.tarotCard.operandA)}</span>
                  <span>B: {describeOperand(spellAnimation.tarotCard.operandB)}</span>
                </div>
              )}
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
                artStyle={effectArtStyle(spellAnimation.effectCard.kind, CARD_WIDTH, CARD_HEIGHT)}
                captionStyle={effectCaptionStyle(spellAnimation.effectCard.kind, CARD_WIDTH, CARD_HEIGHT)}
                selected={false}
                onClick={() => {}}
              />
              <div className="spell-card-label">{spellAnimation.effectCard.label}</div>
            </div>
          )}
        </div>

        {spellAnimation.structureDeltas.length > 0 && (
          <div className="overlay-breakdown">
            <div className="overlay-breakdown-columns">
              <div className="overlay-breakdown-col">
                <div className="overlay-breakdown-header">
                  <span className="overlay-breakdown-player-dot" style={{ background: getPlayerColor(playerIndex(spellAnimation.casterId)) }} />
                  {casterName}
                </div>
                <div className="overlay-breakdown-rows">
                  {casterChanges.length > 0 ? (
                    casterChanges.map(renderDeltaRow)
                  ) : (
                    <div className="overlay-breakdown-empty">No changes</div>
                  )}
                </div>
                <div className="overlay-breakdown-footer">
                  Net: <span className={casterNet >= 0 ? 'delta-positive' : 'delta-negative'}>{casterNet >= 0 ? '+' : ''}{casterNet}</span>
                </div>
              </div>
              <div className="overlay-breakdown-divider" />
              <div className="overlay-breakdown-col">
                <div className="overlay-breakdown-header">Other Players</div>
                <div className="overlay-breakdown-rows">
                  {opponentChanges.length > 0 ? (
                    opponentChanges.map(renderDeltaRow)
                  ) : (
                    <div className="overlay-breakdown-empty">No changes</div>
                  )}
                </div>
                <div className="overlay-breakdown-footer">
                  Net: <span className={opponentNet >= 0 ? 'delta-positive' : 'delta-negative'}>{opponentNet >= 0 ? '+' : ''}{opponentNet}</span>
                </div>
              </div>
            </div>
            <div className="overlay-breakdown-relative">
              Relative: <span className={relativeNet >= 0 ? 'delta-positive' : 'delta-negative'}>{relativeNet >= 0 ? '+' : ''}{relativeNet}</span>
            </div>
          </div>
        )}

        <div className="overlay-footer">
          <label className="overlay-auto-dismiss" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={autoDismiss}
              onChange={toggleAutoDismiss}
            />
            Auto-dismiss
          </label>
          <button className="overlay-dismiss-btn" onClick={dismiss}>
            {autoDismiss ? `Dismiss (${seconds}s)` : 'Dismiss'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
