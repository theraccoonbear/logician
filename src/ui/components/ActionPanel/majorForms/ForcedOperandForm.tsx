import { useState } from 'react'
import { designatedOpponentId, getForcedOperandSpec } from '../../../../engine/majorArcana/forcedOperand'
import type { MajorArcanaCard } from '../../../../engine/types/tarot'
import { useGameEngine } from '../../../hooks/useGameEngine'
import { EffectCardHand } from '../../Hand/EffectCardHand'
import { LogicCardHand } from '../../Hand/LogicCardHand'
import { OperandPicker, operandKindLabel } from './OperandPicker'

export function ForcedOperandForm({
  tarot,
  onConfirm,
  onCancel,
}: {
  tarot: MajorArcanaCard
  onConfirm: (params: unknown) => void
  onCancel: () => void
}) {
  const { state } = useGameEngine()
  const [casterValue, setCasterValue] = useState<string | number | ''>('')
  const [opponentValue, setOpponentValue] = useState<string | number | ''>('')
  const [logicId, setLogicId] = useState<string | null>(null)
  const [effectId, setEffectId] = useState<string | null>(null)

  const spec = getForcedOperandSpec(tarot.id)
  if (!state || !spec) return null

  const player = state.players[state.activePlayerIndex]
  const opponentId = designatedOpponentId(state, player.id, spec.opponentDirection)
  const opponentName = state.players.find((p) => p.id === opponentId)?.name ?? 'opponent'

  const canConfirm = casterValue !== '' && opponentValue !== '' && logicId && effectId

  return (
    <div className="major-arcana-form">
      <div className="redistribute-row">
        <span>You name the {operandKindLabel(spec.casterCategory)}:</span>
        <OperandPicker kind={spec.casterCategory} value={casterValue} onChange={setCasterValue} />
      </div>
      <div className="redistribute-row">
        <span>
          {opponentName} ({spec.opponentDirection}) names the {operandKindLabel(spec.opponentCategory)}:
        </span>
        <OperandPicker kind={spec.opponentCategory} value={opponentValue} onChange={setOpponentValue} />
      </div>
      <LogicCardHand cards={player.logicHand} selectedId={logicId} onSelect={setLogicId} />
      <EffectCardHand cards={player.effectHand} selectedId={effectId} onSelect={setEffectId} />
      <div className="action-buttons">
        <button
          className="action-button"
          disabled={!canConfirm}
          onClick={() => onConfirm({ casterValue, opponentValue, logicCardId: logicId, effectCardId: effectId })}
        >
          Confirm
        </button>
        <button className="action-button secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
