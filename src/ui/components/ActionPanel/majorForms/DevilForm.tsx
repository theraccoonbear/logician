import { useState, useEffect, useMemo } from 'react'
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

  const player = state?.players[state?.activePlayerIndex ?? 0]

  const previewTargets = useMemo(() => {
    if (!state || !logicId) return new Set<string>()
    return new Set(state.structures.filter((s) => !s.fortressed).map((s) => s.id))
  }, [state, logicId])

  useEffect(() => {
    onPreviewTargetsChange?.(previewTargets)
    return () => { onPreviewTargetsChange?.(new Set()) }
  }, [previewTargets, onPreviewTargetsChange])

  if (!state || !player) return null

  return (
    <div className="major-arcana-form">
      <p>Your opponent will name 2 conditions. Using your chosen Logic card and those conditions, all matching structures are destroyed. No Effect card.</p>
      <p className="action-hint" style={{ fontSize: '12px', opacity: 0.7 }}>Pick a Logic card now. After your opponent names conditions, you will see exactly which structures are targeted and may change your pick.</p>
      <LogicCardHand cards={player.logicHand} selectedId={logicId} onSelect={setLogicId} />
      {logicId && (
        <div className="spell-impact-summary" style={{ marginTop: 8 }}>
          <div className="summary-title">{previewTargets.size} potential target{previewTargets.size !== 1 ? 's' : ''} (before conditions)</div>
          <p className="summary-empty-text">Your opponent's conditions will narrow this down. You can change your Logic card after.</p>
        </div>
      )}
      <div className="action-buttons">
        <button className="action-button" disabled={!logicId} style={!logicId ? { opacity: 0.4, cursor: 'not-allowed' } : undefined} onClick={() => onConfirm({ logicCardId: logicId })}>
          Play The Devil
        </button>
        <button className="action-button secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
