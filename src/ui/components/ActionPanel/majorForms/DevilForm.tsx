import { useState, useEffect } from 'react'
import { useGameEngine } from '../../../hooks/useGameEngine'
import { LogicCardHand } from '../../Hand/LogicCardHand'

export function DevilForm({
  onConfirm,
  onCancel,
  onPreviewTargetsChange,
}: {
  onConfirm: (params: unknown) => void
  onCancel: () => void
  onPreviewTargetsChange?: (ids: Set<string>) => void
}) {
  const { state } = useGameEngine()
  const [logicId, setLogicId] = useState<string | null>(null)

  useEffect(() => {
    onPreviewTargetsChange?.(new Set())
    return () => { onPreviewTargetsChange?.(new Set()) }
  }, [onPreviewTargetsChange])

  if (!state) return null

  const player = state.players[state.activePlayerIndex]

  return (
    <div className="major-arcana-form">
      <p>Your opponent will name 2 conditions (terrain, structure type, or level). Using your chosen Logic card and those conditions, all matching structures are destroyed. No Effect card.</p>
      {player.logicHand.length > 0 ? (
        <LogicCardHand cards={player.logicHand} selectedId={logicId} onSelect={setLogicId} />
      ) : (
        <p className="action-hint" style={{ color: '#f44' }}>You have no Logic cards in hand. The Devil requires one.</p>
      )}
      <div className="action-buttons">
        <button className="action-button" disabled={!logicId} onClick={() => onConfirm({ logicCardId: logicId })}>
          Play The Devil
        </button>
        <button className="action-button secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
