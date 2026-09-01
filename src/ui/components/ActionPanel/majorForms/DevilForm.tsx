import { useState } from 'react'
import { useGameEngine } from '../../../hooks/useGameEngine'
import { LogicCardHand } from '../../Hand/LogicCardHand'

export function DevilForm({
  onConfirm,
  onCancel,
}: {
  onConfirm: (params: unknown) => void
  onCancel: () => void
  onPreviewTargetsChange?: (ids: Set<string>) => void
}) {
  const { state } = useGameEngine()
  const [logicId, setLogicId] = useState<string | null>(null)

  if (!state) return null

  const player = state.players[state.activePlayerIndex]

  return (
    <div className="major-arcana-form">
      <p>Two opponents each name a different condition (in a 2-player game, the same opponent names both). No Effect card: the result is always destroy.</p>
      <LogicCardHand cards={player.logicHand} selectedId={logicId} onSelect={setLogicId} />
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
