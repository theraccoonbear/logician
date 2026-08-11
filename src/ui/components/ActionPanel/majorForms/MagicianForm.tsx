import { useState } from 'react'
import { useGameEngine } from '../../../hooks/useGameEngine'
import { EffectCardHand } from '../../Hand/EffectCardHand'
import { LogicCardHand } from '../../Hand/LogicCardHand'

export function MagicianForm({ onConfirm, onCancel }: { onConfirm: (params: unknown) => void; onCancel: () => void }) {
  const { state } = useGameEngine()
  const [opponentId, setOpponentId] = useState<string | null>(null)
  const [myLogicId, setMyLogicId] = useState<string | null>(null)
  const [myEffectId, setMyEffectId] = useState<string | null>(null)
  const [theirLogicId, setTheirLogicId] = useState<string | null>(null)
  const [theirEffectId, setTheirEffectId] = useState<string | null>(null)
  if (!state) return null

  const player = state.players[state.activePlayerIndex]
  const others = state.players.filter((p) => p.id !== player.id)
  const opponent = state.players.find((p) => p.id === opponentId)
  const canConfirm = opponentId && myLogicId && myEffectId && theirLogicId && theirEffectId

  return (
    <div className="major-arcana-form">
      <p>Look at an opponent's hand and exchange one Logic and one Effect card with them.</p>
      <div className="redistribute-row">
        <span>Target opponent:</span>
        <select value={opponentId ?? ''} onChange={(e) => setOpponentId(e.target.value || null)}>
          <option value="">choose…</option>
          {others.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <p>Your cards to give up:</p>
      <LogicCardHand cards={player.logicHand} selectedId={myLogicId} onSelect={setMyLogicId} />
      <EffectCardHand cards={player.effectHand} selectedId={myEffectId} onSelect={setMyEffectId} />
      {opponent && (
        <>
          <p>{opponent.name}'s cards to take:</p>
          <LogicCardHand cards={opponent.logicHand} selectedId={theirLogicId} onSelect={setTheirLogicId} />
          <EffectCardHand cards={opponent.effectHand} selectedId={theirEffectId} onSelect={setTheirEffectId} />
        </>
      )}
      <div className="action-buttons">
        <button
          className="action-button"
          disabled={!canConfirm}
          onClick={() => onConfirm({ opponentId, myLogicId, myEffectId, theirLogicId, theirEffectId })}
        >
          Confirm The Magician
        </button>
        <button className="action-button secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
