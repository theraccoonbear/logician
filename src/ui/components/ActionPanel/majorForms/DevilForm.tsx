import { useState, useMemo, useEffect } from 'react'
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

  const player = state?.players[state.activePlayerIndex]
  const logicCard = logicId && player ? player.logicHand.find((c) => c.instanceId === logicId) : null

  const previewTargets = useMemo(() => {
    if (!state || !logicCard) return new Set<string>()
    return new Set(
      state.structures
        .filter((s) => !s.fortressed)
        .map((s) => s.id),
    )
  }, [state, logicCard])

  useEffect(() => {
    onPreviewTargetsChange?.(previewTargets)
    return () => { onPreviewTargetsChange?.(new Set()) }
  }, [previewTargets, onPreviewTargetsChange])

  if (!state || !player) return null

  return (
    <div className="major-arcana-form">
      <p>Two conditions name a terrain and a structure type (in a 2-player game, the same opponent names both). No Effect card: the result is always destroy.</p>
      <LogicCardHand cards={player.logicHand} selectedId={logicId} onSelect={setLogicId} />
      {logicCard && (
        <div className="spell-impact-summary" style={{ marginTop: 8 }}>
          <div className="summary-title">The Devil</div>
          <p className="summary-empty-text">
            Opponent will name 2 conditions. Structures matching the logic card and both conditions will be destroyed.
          </p>
        </div>
      )}
      <div className="action-buttons">
        <button className="action-button" disabled={!logicId} onClick={() => onConfirm({ logicCardId: logicId })}>
          Confirm The Devil
        </button>
        <button className="action-button secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
