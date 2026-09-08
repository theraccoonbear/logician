import { useGameEngine } from '../../../hooks/useGameEngine'
import { LogicCardHand } from '../../Hand/LogicCardHand'

export function DevilForm({
  onConfirm,
  onCancel,
}: {
  onConfirm: (params: unknown) => void
  onCancel: () => void
}) {
  const { state } = useGameEngine()

  if (!state) return null

  const player = state.players[state.activePlayerIndex]

  return (
    <div className="major-arcana-form">
      <p>Your opponent will name 2 conditions. You then pick a Logic card and see exactly what gets destroyed before confirming.</p>
      {player.logicHand.length > 0 && (
        <>
          <p className="action-hint" style={{ fontSize: '12px', opacity: 0.7 }}>Your Logic cards (for reference):</p>
          <LogicCardHand cards={player.logicHand} selectedId={null} onSelect={() => {}} />
        </>
      )}
      <div className="action-buttons">
        <button className="action-button" onClick={() => onConfirm({})}>
          Play The Devil
        </button>
        <button className="action-button secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
