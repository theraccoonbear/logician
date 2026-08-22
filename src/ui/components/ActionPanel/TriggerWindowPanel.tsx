import { useState } from 'react'
import { HOLD_CARD_HANDLERS, computeRandomizeTargets } from '../../../engine/triggers'
import { getAffectedStructures } from '../../../engine/selectors'
import { LEVEL_BOUNDS } from '../../../engine/types/structure'
import { TERRAIN_TYPES } from '../../../engine/majorArcana/forcedOperand'
import { describeMajorArcana, describeOperand } from '../../operandLabels'
import { LOGIC_CARD_LABELS, EFFECT_CARD_LABELS } from '../../cardLabels'
import { MAJOR_ARCANA_DESCRIPTIONS } from '../../majorArcanaDescriptions'
import { useGameEngine } from '../../hooks/useGameEngine'
import { useTargetPreview } from '../../hooks/useTargetPreview'
import { structureArtUrl } from '../../structureArt'
import { terrainArtUrl } from '../../terrainArt'
import type { TerrainType } from '../../../engine/types/terrain'
import type { Structure } from '../../../engine/types/structure'
import type { EffectCardId } from '../../../engine/types/cards'

function describeEffect(effectKind: EffectCardId, structure: Structure): string {
  const bounds = LEVEL_BOUNDS[structure.type]
  switch (effectKind) {
    case 'UPGRADE_1':
    case 'UPGRADE_2':
    case 'UPGRADE_3': {
      const delta = effectKind === 'UPGRADE_1' ? 1 : effectKind === 'UPGRADE_2' ? 2 : 3
      const newLevel = Math.min(structure.level + delta, bounds.max)
      return newLevel === structure.level ? 'already at max' : `\u2192 Lv.${newLevel}`
    }
    case 'DOWNGRADE_1':
    case 'DOWNGRADE_2':
    case 'DOWNGRADE_3': {
      const delta = effectKind === 'DOWNGRADE_1' ? -1 : effectKind === 'DOWNGRADE_2' ? -2 : -3
      const effective = structure.level + delta
      if (effective <= 0) return '\u2192 destroyed'
      const newLevel = Math.max(effective, bounds.floor)
      return newLevel === structure.level ? 'already at floor' : `\u2192 Lv.${newLevel}`
    }
    case 'MAXIMIZE':
      return structure.level === bounds.max ? 'already at max' : `\u2192 Lv.${bounds.max}`
    case 'RANDOMIZE':
      return `Lv.${bounds.floor}\u2013${bounds.max} (random)`
    case 'COMBO':
      return '+1 or \u22121 (coin flip)'
    default:
      return ''
  }
}

function summarizeNetEffect(effectKind: EffectCardId, structures: Structure[]): string {
  if (structures.length === 0) return 'No structures affected.'

  if (effectKind === 'RANDOMIZE') {
    let totalFloor = 0
    let totalMax = 0
    let totalCurrent = 0
    for (const s of structures) {
      const b = LEVEL_BOUNDS[s.type]
      totalFloor += b.floor
      totalMax += b.max
      totalCurrent += s.level
    }
    const minDelta = totalFloor - totalCurrent
    const maxDelta = totalMax - totalCurrent
    if (minDelta === maxDelta) return `Net: ${minDelta >= 0 ? '+' : ''}${minDelta}`
    return `Net: ${minDelta >= 0 ? '+' : ''}${minDelta} to ${maxDelta >= 0 ? '+' : ''}${maxDelta}`
  }

  if (effectKind === 'COMBO') {
    let deltaIfUp = 0
    let deltaIfDown = 0
    for (const s of structures) {
      const b = LEVEL_BOUNDS[s.type]
      const upLevel = Math.min(s.level + 1, b.max)
      const downEffective = s.level - 1
      const downLevel = downEffective <= 0 ? 0 : Math.max(downEffective, b.floor)
      deltaIfUp += upLevel - s.level
      deltaIfDown += downLevel - s.level
    }
    return `Net: +${deltaIfUp} or ${deltaIfDown} (shared coin flip)`
  }

  let totalDelta = 0
  for (const s of structures) {
    const desc = describeEffect(effectKind, s)
    if (desc.includes('destroyed')) {
      totalDelta -= s.level
    } else {
      const match = desc.match(/\u2192 Lv\.(\d+)/)
      if (match) totalDelta += parseInt(match[1]) - s.level
    }
  }
  return `Net: ${totalDelta >= 0 ? '+' : ''}${totalDelta}`
}
export function TriggerWindowPanel({ onPreviewTargetsChange }: { onPreviewTargetsChange: (ids: Set<string>) => void }) {
  const { state, dispatch, lastError } = useGameEngine()
  const [empressFrom, setEmpressFrom] = useState('')
  const [empressTo, setEmpressTo] = useState('')
  const [hierophantTarget, setHierophantTarget] = useState('')
  const [hierophantLevel, setHierophantLevel] = useState(1)

  const pending = state?.phase === 'awaitingTrigger' ? state.pendingTrigger : undefined

  let spellTargets: Structure[] = []
  let spellTargetIds = new Set<string>()
  if (state && pending && pending.kind === 'spell') {
    spellTargets = getAffectedStructures(state, {
      logicCardId: pending.logicCardKind as never,
      operandA: pending.operandA,
      operandB: pending.operandB,
    })
    spellTargetIds = new Set(spellTargets.map((s) => s.id))
  }

  const hierophantTargets = state && pending ? computeRandomizeTargets(state, pending) : []
  const hierophantTargetIds = new Set(hierophantTargets.map((s) => s.id))

  const allPreviewIds = new Set([...spellTargetIds, ...hierophantTargetIds])
  useTargetPreview(state && pending ? allPreviewIds : new Set(), onPreviewTargetsChange)

  if (!state || !pending || !state.triggerQueue?.length) return null

  const responderId = state.triggerQueue[0]
  const responder = state.players.find((p) => p.id === responderId)!
  const caster = state.players.find((p) => p.id === pending.casterId)
  const eligible = responder.heldMajorArcana.filter((card) => HOLD_CARD_HANDLERS[card.id]?.canRespond(pending, responderId))

  const play = (cardInstanceId: string, params?: unknown) => {
    dispatch({ type: 'PLAY_HELD_ARCANA', playerId: responderId, cardId: cardInstanceId, params })
  }
  const pass = () => dispatch({ type: 'PASS_TRIGGER_WINDOW', playerId: responderId })

  const renderSpellContext = () => {
    if (pending.kind === 'spell') {
      const logicLabel = LOGIC_CARD_LABELS[pending.logicCardKind as keyof typeof LOGIC_CARD_LABELS] ?? pending.logicCardKind
      const effectLabel = EFFECT_CARD_LABELS[pending.effectCardKind]
      const tarotName = `${pending.tarot.rank} of ${pending.tarot.suit}`
      const operandA = describeOperand(pending.operandA)
      const operandB = describeOperand(pending.operandB)
      const isUncertain = pending.effectCardKind === 'RANDOMIZE' || pending.effectCardKind === 'COMBO'

      return (
        <div className="trigger-context">
          <div className="trigger-context-header">{caster?.name} cast a spell</div>
          <div className="trigger-context-spell">
            <span className="trigger-context-card">{tarotName}</span>
            <span className="trigger-context-op">+</span>
            <span className="trigger-context-card">{logicLabel}</span>
            <span className="trigger-context-op">+</span>
            <span className="trigger-context-card">{effectLabel}</span>
          </div>
          <div className="trigger-context-operands">
            A = {operandA}, B = {operandB}
          </div>
          {renderTargets()}
          {spellTargets.length > 0 && (
            <div className={`trigger-context-net ${isUncertain ? 'trigger-context-net-uncertain' : ''}`}>
              {summarizeNetEffect(pending.effectCardKind, spellTargets)}
              {isUncertain && <span className="trigger-context-uncertain-badge">outcome not yet determined</span>}
            </div>
          )}
        </div>
      )
    }

    const label = describeMajorArcana(pending.majorId)
    const description = MAJOR_ARCANA_DESCRIPTIONS[pending.majorId]
    return (
      <div className="trigger-context">
        <div className="trigger-context-header">{caster?.name} played</div>
        <div className="trigger-context-spell">
          <span className="trigger-context-card trigger-context-major">{label}</span>
        </div>
        {description && <div className="trigger-context-desc">{description}</div>}
        {pending.majorId === 'WHEEL' && renderWheelTargets()}
      </div>
    )
  }

  const renderTargets = () => {
    if (spellTargets.length === 0) {
      return <div className="trigger-context-targets trigger-context-targets-empty">No structures affected</div>
    }
    if (responder.assistanceLevel === 'none') {
      return <div className="trigger-context-targets">{spellTargets.length} structure(s) affected</div>
    }
    const casterStructures = spellTargets.filter((s) => s.owner === pending.casterId)
    const opponentStructures = spellTargets.filter((s) => s.owner !== pending.casterId)
    return (
      <div className="trigger-context-targets">
        {casterStructures.length > 0 && (
          <div className="trigger-target-group">
            <span className="trigger-target-label">{caster?.name}&apos;s structures:</span>
            {casterStructures.map((s) => renderTargetRow(s))}
          </div>
        )}
        {opponentStructures.length > 0 && (
          <div className="trigger-target-group">
            <span className="trigger-target-label">Opponent structures:</span>
            {opponentStructures.map((s) => renderTargetRow(s))}
          </div>
        )}
      </div>
    )
  }

  const renderTargetRow = (s: Structure) => {
    const hex = state!.board.find((h) => h.id === s.hexId)
    const terrain = (hex?.terrain ?? 'Prairies') as TerrainType
    const effectDesc = pending.kind === 'spell' ? describeEffect(pending.effectCardKind, s) : null
    const isUncertain = pending.kind === 'spell' && (pending.effectCardKind === 'RANDOMIZE' || pending.effectCardKind === 'COMBO')
    return (
      <div key={s.id} className={`trigger-target-row ${isUncertain ? 'trigger-target-row-uncertain' : ''}`}>
        <img className="trigger-target-terrain" src={terrainArtUrl(terrain)} alt={terrain} title={terrain} />
        {structureArtUrl({ type: s.type, level: s.level }) ? (
          <img className="trigger-target-struct" src={structureArtUrl({ type: s.type, level: s.level })!} alt={s.type} />
        ) : (
          <span className="trigger-target-struct-fallback">{s.type[0]}</span>
        )}
        <span className="trigger-target-info">
          {s.type} Lv.{s.level} on {s.hexId}
        </span>
        {effectDesc && (
          <span className={`trigger-target-delta ${isUncertain ? 'trigger-target-delta-uncertain' : ''}`}>
            {effectDesc}
          </span>
        )}
      </div>
    )
  }

  const renderWheelTargets = () => {
    if (responder.assistanceLevel === 'none') {
      return <div className="trigger-context-targets">3 structures will be randomized</div>
    }
    return (
      <div className="trigger-context-targets">
        <div className="trigger-target-group">
          {hierophantTargets.map((s) => {
            const bounds = LEVEL_BOUNDS[s.type]
            return (
              <div key={s.id} className="trigger-target-row trigger-target-row-uncertain">
                {structureArtUrl({ type: s.type, level: s.level }) ? (
                  <img className="trigger-target-struct" src={structureArtUrl({ type: s.type, level: s.level })!} alt={s.type} />
                ) : (
                  <span className="trigger-target-struct-fallback">{s.type[0]}</span>
                )}
                <span className="trigger-target-info">
                  {s.type} Lv.{s.level} on {s.hexId}
                </span>
                <span className="trigger-target-delta trigger-target-delta-uncertain">
                  Lv.{bounds.floor}\u2013{bounds.max} (random)
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="action-panel trigger-window-panel">
      {renderSpellContext()}

      <div className="trigger-responder-line">
        <strong>{responder.name}</strong>, respond with a held card or pass.
      </div>

      {eligible.length === 0 && <p className="trigger-no-eligible">No held card can react to this \u2014 pass to continue.</p>}
      {eligible.map((card) => {
        const description = MAJOR_ARCANA_DESCRIPTIONS[card.id]
        if (card.id === 'FOOL' || card.id === 'EMPEROR') {
          return (
            <div className="major-arcana-form" key={card.instanceId}>
              <button className="action-button" onClick={() => play(card.instanceId)}>
                Play <span className="held-card-name" title={description}>{describeMajorArcana(card.id)}</span>
              </button>
            </div>
          )
        }
        if (card.id === 'EMPRESS') {
          return (
            <div className="major-arcana-form" key={card.instanceId}>
              <div className="held-card-header">
                <span className="held-card-name" title={description}>{describeMajorArcana(card.id)}</span>
              </div>
              <p>Temporarily reinterpret one terrain as another for this resolution:</p>
              <div className="redistribute-row">
                <select value={empressFrom} onChange={(e) => setEmpressFrom(e.target.value)}>
                  <option value="">from\u2026</option>
                  {TERRAIN_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <select value={empressTo} onChange={(e) => setEmpressTo(e.target.value)}>
                  <option value="">to\u2026</option>
                  {TERRAIN_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <button
                className="action-button"
                disabled={!empressFrom || !empressTo}
                onClick={() => play(card.instanceId, { from: empressFrom, to: empressTo })}
              >
                Play <span className="held-card-name" title={description}>The Empress</span>
              </button>
            </div>
          )
        }
        if (card.id === 'HIEROPHANT') {
          return (
            <div className="major-arcana-form" key={card.instanceId}>
              <div className="held-card-header">
                <span className="held-card-name" title={description}>{describeMajorArcana(card.id)}</span>
              </div>
              <p>Remove one target from the randomization and set its level directly:</p>
              <div className="redistribute-row">
                <select value={hierophantTarget} onChange={(e) => setHierophantTarget(e.target.value)}>
                  <option value="">choose a target\u2026</option>
                  {hierophantTargets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.type} Lv.{s.level} on {s.hexId}
                    </option>
                  ))}
                </select>
                <input type="number" value={hierophantLevel} min={1} onChange={(e) => setHierophantLevel(Number(e.target.value))} />
              </div>
              <button
                className="action-button"
                disabled={!hierophantTarget}
                onClick={() => play(card.instanceId, { structureId: hierophantTarget, newLevel: hierophantLevel })}
              >
                Play <span className="held-card-name" title={description}>The Hierophant</span>
              </button>
            </div>
          )
        }
        return null
      })}
      <div className="action-buttons">
        <button className="action-button secondary" onClick={pass}>
          Pass
        </button>
      </div>
      {lastError && <p className="action-error">{lastError}</p>}
    </div>
  )
}
