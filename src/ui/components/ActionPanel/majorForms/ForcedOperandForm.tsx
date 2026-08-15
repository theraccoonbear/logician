import { useState } from 'react'
import { designatedOpponentId, getForcedOperandSpec } from '../../../../engine/majorArcana/forcedOperand'
import { getAffectedStructures } from '../../../../engine/selectors'
import type { MajorArcanaCard, Operand } from '../../../../engine/types/tarot'
import { useGameEngine } from '../../../hooks/useGameEngine'
import { useTargetPreview } from '../../../hooks/useTargetPreview'
import { EffectCardHand } from '../../Hand/EffectCardHand'
import { LogicCardHand } from '../../Hand/LogicCardHand'
import { OperandPicker, operandKindLabel } from './OperandPicker'

export function ForcedOperandForm({
  tarot,
  onConfirm,
  onCancel,
  onPreviewTargetsChange,
}: {
  tarot: MajorArcanaCard
  onConfirm: (params: unknown) => void
  onCancel: () => void
  onPreviewTargetsChange?: (ids: Set<string>) => void
}) {
  const { state } = useGameEngine()
  const [casterValue, setCasterValue] = useState<string | number | ''>('')
  const [opponentValue, setOpponentValue] = useState<string | number | ''>('')
  const [logicId, setLogicId] = useState<string | null>(null)
  const [effectId, setEffectId] = useState<string | null>(null)

  const spec = getForcedOperandSpec(tarot.id)
  const logicCard = state?.players[state.activePlayerIndex].logicHand.find((c) => c.instanceId === logicId)
  const previewIds =
    state && spec && casterValue !== '' && opponentValue !== '' && logicCard
      ? new Set(
          getAffectedStructures(state, {
            logicCardId: logicCard.kind,
            // Cast, not narrowed: the preview trusts the same values the real resolver validates
            // via validateOperandValue at confirm-time — this is best-effort while typing, not
            // the source of truth for whether the combo is actually legal.
            operandA: { kind: spec.casterCategory, value: casterValue as Operand['value'] },
            operandB: { kind: spec.opponentCategory, value: opponentValue as Operand['value'] },
          }).map((s) => s.id),
        )
      : new Set<string>()
  useTargetPreview(previewIds, onPreviewTargetsChange)

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
