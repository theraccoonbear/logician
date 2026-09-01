import { useState, useEffect, useMemo, useCallback } from 'react'
import { getForcedOperandSpec, designatedOpponentId } from '../../../../engine/majorArcana/forcedOperand'
import { applyAction } from '../../../../engine/reducer'
import { createAI } from '../../../../engine/ai'
import { getAffectedStructures } from '../../../../engine/selectors'
import { applyEffect } from '../../../../engine/levelResolution'
import type { MajorArcanaCard } from '../../../../engine/types/tarot'
import type { Operand } from '../../../../engine/types/tarot'
import type { GameState } from '../../../../engine/types/state'
import type { EffectCardId, LogicCardId } from '../../../../engine/types/cards'
import type { OperandKind } from '../../../../engine/types/tarot'
import { useGameEngine } from '../../../hooks/useGameEngine'
import { EffectCardHand } from '../../Hand/EffectCardHand'
import { LogicCardHand } from '../../Hand/LogicCardHand'
import { OperandPicker, operandKindLabel } from './OperandPicker'

interface StructurePreview {
  id: string
  type: string
  owner: string
  oldLevel: number
  newLevel: number | null
  destroyed: boolean
  vpDelta: number
}

interface PreviewResult {
  opponentValue: unknown
  structures: StructurePreview[]
  totalVPDelta: number
}

function predictAIOpponentChoice(
  state: GameState,
  casterId: string,
  majorTarot: MajorArcanaCard,
  casterValue: unknown,
  logicCardKind: string,
  effectCardKind: EffectCardId,
): Record<string, unknown> | null {
  const spec = getForcedOperandSpec(majorTarot.id)
  if (!spec) return null
  const opponentId = designatedOpponentId(state, casterId, spec.opponentDirection)
  const opponent = state.players.find((p) => p.id === opponentId)
  if (!opponent?.isAI) return null

  const caster = state.players.find((p) => p.id === casterId)
  const logicCard = caster?.logicHand.find((c) => c.kind === logicCardKind)
  const effectCard = caster?.effectHand.find((c) => c.kind === effectCardKind)
  if (!logicCard || !effectCard) return null

  const playResult = applyAction(state, {
    type: 'PLAY_MAJOR_ARCANA',
    playerId: casterId,
    tarotId: majorTarot.instanceId,
    params: { casterValue, logicCardId: logicCard.instanceId, effectCardId: effectCard.instanceId },
  })
  if (!playResult.ok) return null

  const ai = createAI(opponent.aiDifficulty ?? 'heuristic')
  const choiceAction = ai.chooseOpponentChoice(playResult.state, opponentId)
  if (choiceAction.type !== 'SUBMIT_OPPONENT_CHOICE') return null
  return choiceAction.choice as Record<string, unknown>
}

function computeFullPreview(
  state: GameState,
  spec: { casterCategory: string; opponentCategory: string },
  casterValue: unknown,
  opponentValue: unknown,
  logicCardKind: string,
  effectCardKind: EffectCardId,
  casterId: string,
): PreviewResult | null {
  if (casterValue == null || casterValue === '' || opponentValue == null || opponentValue === '') return null

    const operandA: Operand = { kind: spec.casterCategory as Operand['kind'], value: casterValue as Operand['value'] }
    const operandB: Operand = { kind: spec.opponentCategory as Operand['kind'], value: opponentValue as Operand['value'] }
    const affected = getAffectedStructures(state, { logicCardId: logicCardKind as LogicCardId, operandA, operandB })

  let totalVPDelta = 0
  const structures: StructurePreview[] = affected.map((s) => {
    const result = applyEffect(s, effectCardKind)
    const destroyed = result.destroyed
    const newLevel = destroyed ? 0 : result.newLevel
    const vpDelta = s.owner === casterId ? (newLevel - s.level) : -(s.level - newLevel)
    totalVPDelta += vpDelta
    return {
      id: s.id,
      type: s.type,
      owner: s.owner,
      oldLevel: s.level,
      newLevel: destroyed ? null : newLevel,
      destroyed,
      vpDelta,
    }
  })

  return { opponentValue, structures, totalVPDelta }
}

function formatOperandValue(kind: OperandKind, value: unknown): string {
  return `${operandKindLabel(kind)} ${String(value)}`
}

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
  const { state, dispatch } = useGameEngine()
  const [casterValue, setCasterValue] = useState<string | number | ''>('')
  const [logicId, setLogicId] = useState<string | null>(null)
  const [effectId, setEffectId] = useState<string | null>(null)

  const spec = getForcedOperandSpec(tarot.id)
  const player = state?.players[state.activePlayerIndex]
  const opponentId = state && spec && player ? designatedOpponentId(state, player.id, spec.opponentDirection) : null
  const opponent = state && opponentId ? state.players.find((p) => p.id === opponentId) : null
  const opponentIsAI = Boolean(opponent?.isAI)
  const canConfirm = casterValue !== '' && logicId && effectId

  const logicCard = logicId ? player?.logicHand.find((c) => c.instanceId === logicId) : null
  const effectCard = effectId ? player?.effectHand.find((c) => c.instanceId === effectId) : null

  const aiChoice = useMemo(() => {
    if (!canConfirm || !opponentIsAI || !state || !player || !spec || !logicCard || !effectCard) return null
    return predictAIOpponentChoice(state, player.id, tarot, casterValue, logicCard.kind, effectCard.kind)
  }, [canConfirm, opponentIsAI, state, player, tarot, casterValue, logicCard, effectCard, spec])

  const preview = useMemo(() => {
    if (!state || !spec || !player || !logicCard || !effectCard) return null
    if (casterValue === '') return null

    if (opponentIsAI && aiChoice) {
      return computeFullPreview(state, { casterCategory: spec.casterCategory, opponentCategory: spec.opponentCategory }, casterValue, aiChoice.opponentValue, logicCard.kind, effectCard.kind, player.id)
    }

    const partialAffected = state.structures.filter((s) => {
      const hex = state.board.find((h) => h.id === s.hexId)
      if (!hex) return false
      if (spec.casterCategory === 'terrain') return hex.terrain === casterValue
      if (spec.casterCategory === 'structureType') return s.type === casterValue
      if (spec.casterCategory === 'level') return s.level === casterValue
      return false
    })
    return {
      opponentValue: null as unknown,
      structures: partialAffected.map((s) => ({
        id: s.id, type: s.type, owner: s.owner, oldLevel: s.level,
        newLevel: null as number | null, destroyed: false, vpDelta: 0,
      })),
      totalVPDelta: 0,
    }
  }, [state, spec, player, logicCard, effectCard, casterValue, opponentIsAI, aiChoice])

  const previewTargets = useMemo(() => {
    return new Set(preview?.structures.map((s) => s.id) ?? [])
  }, [preview])

  useEffect(() => {
    onPreviewTargetsChange?.(previewTargets)
    return () => { onPreviewTargetsChange?.(new Set()) }
  }, [previewTargets, onPreviewTargetsChange])

  const handleConfirm = useCallback(() => {
    if (!canConfirm || !player || !opponentId) return
    dispatch({
      type: 'PLAY_MAJOR_ARCANA',
      playerId: player.id,
      tarotId: tarot.instanceId,
      params: { casterValue, logicCardId: logicId, effectCardId: effectId },
    })
    if (opponentIsAI && aiChoice) {
      dispatch({
        type: 'SUBMIT_OPPONENT_CHOICE',
        playerId: opponentId,
        choice: aiChoice,
      })
    }
    onConfirm({ casterValue, logicCardId: logicId, effectCardId: effectId })
  }, [canConfirm, player, opponentId, dispatch, tarot.instanceId, casterValue, logicId, effectId, opponentIsAI, aiChoice, onConfirm])

  if (!state || !spec || !player) return null

  return (
    <div className="major-arcana-form">
      <div className="redistribute-row">
        <span>You name the {operandKindLabel(spec.casterCategory)}:</span>
        <OperandPicker kind={spec.casterCategory} value={casterValue} onChange={setCasterValue} />
      </div>

      {opponentIsAI && preview?.opponentValue != null && (
        <div className="redistribute-row major-arcana-opponent-waiting">
          <span className="opponent-waiting-label">
            {opponent!.name} names {formatOperandValue(spec.opponentCategory as OperandKind, preview.opponentValue)}.
          </span>
        </div>
      )}

      <LogicCardHand cards={player.logicHand} selectedId={logicId} onSelect={setLogicId} />
      <EffectCardHand cards={player.effectHand} selectedId={effectId} onSelect={setEffectId} />

      {preview && preview.structures.length > 0 && (
        <div className="major-arcana-preview">
          <div className="preview-header">
            {preview.structures.length} structure{preview.structures.length !== 1 ? 's' : ''} affected
            {preview.totalVPDelta !== 0 && (
              <span className={`vp-delta ${preview.totalVPDelta > 0 ? 'positive' : 'negative'}`}>
                {' '}({preview.totalVPDelta > 0 ? '+' : ''}{preview.totalVPDelta} VP)
              </span>
            )}
          </div>
          <ul className="preview-structure-list">
            {preview.structures.map((s) => (
              <li key={s.id} className="preview-structure-item">
                <span className="preview-structure-type">{s.type}</span>
                {' '}
                <span className="preview-structure-level">
                  {s.oldLevel}{' '}
                  {s.destroyed
                    ? <span className="preview-destroyed">destroyed</span>
                    : <>{'\u2192'} {s.newLevel}</>}
                </span>
                {s.vpDelta !== 0 && (
                  <span className={`preview-structure-vp ${s.vpDelta > 0 ? 'positive' : 'negative'}`}>
                    {' '}({s.vpDelta > 0 ? '+' : ''}{s.vpDelta} VP)
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="action-buttons">
        <button
          className="action-button"
          disabled={!canConfirm}
          onClick={handleConfirm}
        >
          Cast
        </button>
        <button className="action-button secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
