import { EffectCardHand } from '../Hand/EffectCardHand'
import { LogicCardHand } from '../Hand/LogicCardHand'
import { useGameEngine } from '../../hooks/useGameEngine'

export interface SpellSelection {
  logicId: string | null
  effectId: string | null
  tarotId: string | null
}

export function SpellBuilder({
  selection,
  onChange,
}: {
  selection: SpellSelection
  onChange: (next: SpellSelection) => void
}) {
  const { state, dispatch, lastError } = useGameEngine()
  if (!state) return null

  const player = state.players[state.activePlayerIndex]
  const canCast = Boolean(selection.logicId && selection.effectId && selection.tarotId)

  const cast = () => {
    if (!canCast) return
    dispatch({
      type: 'CAST_SPELL',
      playerId: player.id,
      logicCardId: selection.logicId!,
      effectCardId: selection.effectId!,
      tarotId: selection.tarotId!,
    })
    onChange({ logicId: null, effectId: null, tarotId: null })
  }

  return (
    <div className="cast-pane">
      <LogicCardHand
        cards={player.logicHand}
        selectedId={selection.logicId}
        onSelect={(id) => onChange({ ...selection, logicId: id })}
      />
      <EffectCardHand
        cards={player.effectHand}
        selectedId={selection.effectId}
        onSelect={(id) => onChange({ ...selection, effectId: id })}
      />
      <div className="action-buttons">
        <button className="action-button" disabled={!canCast} onClick={cast}>
          Cast Spell
        </button>
        <button className="action-button secondary" onClick={() => dispatch({ type: 'END_TURN', playerId: player.id })}>
          End Turn Without Casting
        </button>
      </div>
      {lastError && <p className="action-error">{lastError}</p>}
    </div>
  )
}
