import { EffectCardHand } from '../Hand/EffectCardHand'
import { LogicCardHand } from '../Hand/LogicCardHand'
import { useGameEngine } from '../../hooks/useGameEngine'
import { applyAction } from '../../../engine/reducer'
import { getAffectedStructures } from '../../../engine/selectors'
import { LEVEL_BOUNDS } from '../../../engine/types/structure'
import { terrainArtUrl } from '../../terrainArt'
import { structureArtUrl } from '../../structureArt'
import type { TerrainType } from '../../../engine/types/terrain'
import type { Structure } from '../../../engine/types/structure'
import type { EffectCardId } from '../../../engine/types/cards'

export interface SpellSelection {
  logicId: string | null
  effectId: string | null
  tarotId: string | null
}

const UNCERTAIN_EFFECTS: ReadonlySet<EffectCardId> = new Set(['RANDOMIZE', 'COMBO'])

/** Compute the exact probability distribution of net delta via convolution. */
function computeNetDistribution(effectKind: EffectCardId, structures: Structure[]): Map<number, number> | null {
  if (structures.length === 0) return null

  if (effectKind === 'RANDOMIZE') {
    // Each structure independently picks uniformly from [floor, max].
    // The net delta distribution is the convolution of per-structure delta distributions.
    let dist: Map<number, number> = new Map([[0, 1]])
    for (const s of structures) {
      const b = LEVEL_BOUNDS[s.type]
      const next = new Map<number, number>()
      for (const [prevDelta, prevProb] of dist) {
        const span = b.max - b.floor + 1
        for (let lv = b.floor; lv <= b.max; lv++) {
          const d = prevDelta + (lv - s.level)
          next.set(d, (next.get(d) ?? 0) + prevProb / span)
        }
      }
      dist = next
    }
    return dist
  }

  if (effectKind === 'COMBO') {
    // Shared coin flip: all structures upgrade together or all downgrade together.
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
    return new Map([
      [deltaIfUp, 0.5],
      [deltaIfDown, 0.5],
    ])
  }

  return null
}

function formatDelta(n: number): string {
  return `${n >= 0 ? '+' : ''}${n}`
}

/** Summarize a distribution into a one-liner with probability of net positive / negative / zero. */
function summarizeDistribution(dist: Map<number, number>): { text: string; hasPositive: boolean; hasNegative: boolean } {
  let probPositive = 0
  let probNegative = 0
  let probZero = 0
  let minDelta = Infinity
  let maxDelta = -Infinity
  for (const [delta, prob] of dist) {
    if (delta > 0) probPositive += prob
    else if (delta < 0) probNegative += prob
    else probZero += prob
    if (delta < minDelta) minDelta = delta
    if (delta > maxDelta) maxDelta = delta
  }

  const pct = (p: number) => Math.round(p * 100)

  if (minDelta === maxDelta) {
    return { text: `Net: ${formatDelta(minDelta)}`, hasPositive: minDelta > 0, hasNegative: minDelta < 0 }
  }

  const parts: string[] = []
  if (probZero > 0 && probZero < 1) parts.push(`${pct(probZero)}% unchanged`)
  if (probPositive > 0) parts.push(`${pct(probPositive)}% gain`)
  if (probNegative > 0) parts.push(`${pct(probNegative)}% loss`)
  const text = parts.length > 0 ? parts.join(', ') : `Net: ${formatDelta(minDelta)} to ${formatDelta(maxDelta)}`

  return { text, hasPositive: probPositive > 0, hasNegative: probNegative > 0 }
}

function describeRangeEffect(effectKind: EffectCardId, structure: Structure): string {
  const bounds = LEVEL_BOUNDS[structure.type]
  switch (effectKind) {
    case 'RANDOMIZE':
      return `Lv.${bounds.floor}\u2013${bounds.max} (random)`
    case 'COMBO':
      return '+1 or \u22121 (coin flip)'
    default:
      return ''
  }
}

export function SpellBuilder({
  selection,
  onChange,
}: {
  selection: SpellSelection
  onChange: (next: SpellSelection) => void
}) {
  const { state, dispatch, lastError } = useGameEngine()
  if (!state) return null

  const player = state.players[state.activePlayerIndex]
  const canCast = Boolean(selection.logicId && selection.effectId && selection.tarotId)

  const cast = () => {
    if (!canCast) return
    dispatch({
      type: 'CAST_SPELL',
      playerId: player.id,
      logicCardId: selection.logicId!,
      effectCardId: selection.effectId!,
      tarotId: selection.tarotId!,
    })
    onChange({ logicId: null, effectId: null, tarotId: null })
  }

  // Simulate spell outcome for Point Impact Summary in 'full' assistance mode
  const showSummary = player.assistanceLevel === 'full' && canCast
  let summaryNode = null

  if (showSummary) {
    const effectCard = player.effectHand.find((c) => c.instanceId === selection.effectId)
    const isUncertain = Boolean(effectCard && UNCERTAIN_EFFECTS.has(effectCard.kind))

    if (isUncertain && effectCard) {
      // For probabilistic effects, derive operands from the tarot card and
      // compute range-based previews instead of a single simulated outcome.
      const tarot = state.tarotRow.find((t) => t.instanceId === selection.tarotId)
      const logicCard = player.logicHand.find((c) => c.instanceId === selection.logicId)

      if (tarot && tarot.kind === 'minor' && logicCard) {
        const affected = getAffectedStructures(state, {
          logicCardId: logicCard.kind,
          operandA: tarot.operandA,
          operandB: tarot.operandB,
        })

        const casterStructures = affected.filter((s) => s.owner === player.id)
        const opponentStructures = affected.filter((s) => s.owner !== player.id)
        const hasChanges = affected.length > 0

        const renderRangeRow = (s: Structure) => {
          const hex = state.board.find((h) => h.id === s.hexId)
          const terrain = (hex?.terrain ?? 'Prairies') as TerrainType
          const terrainImg = terrainArtUrl(terrain)
          const structImg = structureArtUrl({ type: s.type, level: s.level })
          const effectDesc = describeRangeEffect(effectCard.kind, s)

          return (
            <div key={s.id} className="summary-change-row">
              <div className="summary-assets">
                <img className="summary-asset-terrain" src={terrainImg} alt={terrain} title={terrain} />
                {structImg ? (
                  <img className="summary-asset-structure" src={structImg} alt={s.type} title={`${s.type} (Level ${s.level})`} />
                ) : (
                  <span className="summary-asset-fallback">{s.type[0]}</span>
                )}
              </div>
              <span className="summary-delta trigger-target-delta-uncertain">{effectDesc}</span>
            </div>
          )
        }

        const casterDist = computeNetDistribution(effectCard.kind, casterStructures)
        const opponentDist = computeNetDistribution(effectCard.kind, opponentStructures)
        const casterSummary = casterDist ? summarizeDistribution(casterDist) : null
        const opponentSummary = opponentDist ? summarizeDistribution(opponentDist) : null

        // Relative swing: convolve caster vs opponent delta distributions
        // to get the probability of each possible "you minus them" outcome.
        let relativeText = ''
        if (casterDist && opponentDist) {
          const relDist = new Map<number, number>()
          for (const [cDelta, cProb] of casterDist) {
            for (const [oDelta, oProb] of opponentDist) {
              const rel = cDelta - oDelta
              relDist.set(rel, (relDist.get(rel) ?? 0) + cProb * oProb)
            }
          }
          const relSummary = summarizeDistribution(relDist)
          relativeText = relSummary.text
        } else if (casterSummary) {
          relativeText = `You: ${casterSummary.text}`
        } else if (opponentSummary) {
          relativeText = `Opponents: ${opponentSummary.text}`
        }

        summaryNode = (
          <div className="spell-impact-summary">
            <div className="summary-title">Point Impact Summary</div>
            {hasChanges ? (
              <>
                <div className="summary-comparison-table">
                  <div className="summary-column">
                    <div className="summary-column-header">You</div>
                    <div className="summary-rows">
                      {casterStructures.length > 0 ? (
                        casterStructures.map(renderRangeRow)
                      ) : (
                        <p className="summary-no-changes">No changes</p>
                      )}
                    </div>
                    {casterSummary && (
                      <div className="summary-column-footer trigger-target-delta-uncertain">
                        {casterSummary.text}
                      </div>
                    )}
                  </div>
                  <div className="summary-divider" />
                  <div className="summary-column">
                    <div className="summary-column-header">Other Players</div>
                    <div className="summary-rows">
                      {opponentStructures.length > 0 ? (
                        opponentStructures.map(renderRangeRow)
                      ) : (
                        <p className="summary-no-changes">No changes</p>
                      )}
                    </div>
                    {opponentSummary && (
                      <div className="summary-column-footer trigger-target-delta-uncertain">
                        {opponentSummary.text}
                      </div>
                    )}
                  </div>
                </div>
                {relativeText && (
                  <div className="summary-comparison-outcome trigger-context-net-uncertain">
                    {relativeText}
                    <span className="trigger-context-uncertain-badge">outcome not yet determined</span>
                  </div>
                )}
              </>
            ) : (
              <p className="summary-empty-text">This spell will not alter any structures on the board.</p>
            )}
          </div>
        )
      }
    } else {
      // Deterministic effect: simulate and show exact outcome
      const simulationResult = applyAction(state, {
        type: 'CAST_SPELL',
        playerId: player.id,
        logicCardId: selection.logicId!,
        effectCardId: selection.effectId!,
        tarotId: selection.tarotId!,
      })

      if (simulationResult.ok) {
        const nextState = simulationResult.state
        const currentStructuresMap = new Map(state.structures.map((s) => [s.id, s]))
        const nextStructuresMap = new Map(nextState.structures.map((s) => [s.id, s]))

        interface StructureChange {
          structure: Structure
          terrain: TerrainType
          isDestroyed: boolean
          oldLevel: number
          newLevel: number
          delta: number
        }

        const playerChanges: StructureChange[] = []
        const opponentChanges: StructureChange[] = []

        for (const [id, current] of currentStructuresMap.entries()) {
          const next = nextStructuresMap.get(id)
          const hex = state.board.find((h) => h.id === current.hexId)
          const terrain = hex ? hex.terrain : 'Prairies'

          if (!next) {
            const change: StructureChange = {
              structure: current,
              terrain,
              isDestroyed: true,
              oldLevel: current.level,
              newLevel: 0,
              delta: -current.level,
            }
            if (current.owner === player.id) {
              playerChanges.push(change)
            } else {
              opponentChanges.push(change)
            }
          } else if (next.level !== current.level) {
            const change: StructureChange = {
              structure: current,
              terrain,
              isDestroyed: false,
              oldLevel: current.level,
              newLevel: next.level,
              delta: next.level - current.level,
            }
            if (current.owner === player.id) {
              playerChanges.push(change)
            } else {
              opponentChanges.push(change)
            }
          }
        }

        const renderChangeRow = (c: StructureChange) => {
          const terrainImg = terrainArtUrl(c.terrain)
          const structImg = structureArtUrl({ type: c.structure.type, level: c.oldLevel })
          const deltaText = c.isDestroyed ? `destroyed (-${c.oldLevel})` : `${c.delta > 0 ? '+' : ''}${c.delta}`
          const deltaClass = c.delta > 0 ? 'delta-positive' : 'delta-negative'

          return (
            <div key={c.structure.id} className="summary-change-row">
              <div className="summary-assets">
                <img className="summary-asset-terrain" src={terrainImg} alt={c.terrain} title={c.terrain} />
                {structImg ? (
                  <img className="summary-asset-structure" src={structImg} alt={c.structure.type} title={`${c.structure.type} (Level ${c.oldLevel})`} />
                ) : (
                  <span className="summary-asset-fallback">{c.structure.type[0]}</span>
                )}
              </div>
              <span className={`summary-delta ${deltaClass}`}>{deltaText}</span>
            </div>
          )
        }

        const casterNet = playerChanges.reduce((sum, c) => sum + c.delta, 0)
        const opponentNet = opponentChanges.reduce((sum, c) => sum + c.delta, 0)
        const hasChanges = playerChanges.length > 0 || opponentChanges.length > 0

        summaryNode = (
          <div className="spell-impact-summary">
            <div className="summary-title">Point Impact Summary</div>
            {hasChanges ? (
              <>
                <div className="summary-comparison-table">
                  <div className="summary-column">
                    <div className="summary-column-header">You</div>
                    <div className="summary-rows">
                      {playerChanges.length > 0 ? (
                        playerChanges.map(renderChangeRow)
                      ) : (
                        <p className="summary-no-changes">No changes</p>
                      )}
                    </div>
                    <div className="summary-column-footer">
                      Net: <span className={casterNet >= 0 ? 'delta-positive' : 'delta-negative'}>{casterNet >= 0 ? '+' : ''}{casterNet}</span>
                    </div>
                  </div>
                  <div className="summary-divider" />
                  <div className="summary-column">
                    <div className="summary-column-header">Other Players</div>
                    <div className="summary-rows">
                      {opponentChanges.length > 0 ? (
                        opponentChanges.map(renderChangeRow)
                      ) : (
                        <p className="summary-no-changes">No changes</p>
                      )}
                    </div>
                    <div className="summary-column-footer">
                      Net: <span className={opponentNet >= 0 ? 'delta-positive' : 'delta-negative'}>{opponentNet >= 0 ? '+' : ''}{opponentNet}</span>
                    </div>
                  </div>
                </div>
                <div className="summary-comparison-outcome">
                  Net Result Comparison: <span className={casterNet - opponentNet >= 0 ? 'delta-positive' : 'delta-negative'}>{casterNet - opponentNet >= 0 ? '+' : ''}{casterNet - opponentNet}</span> relative to others
                </div>
              </>
            ) : (
              <p className="summary-empty-text">This spell will not alter any structures on the board.</p>
            )}
          </div>
        )
      }
    }
  }

  return (
    <div className="cast-pane">
      <div className="card-hands-row">
        <LogicCardHand
          cards={player.logicHand}
          selectedId={selection.logicId}
          onSelect={(id) => onChange({ ...selection, logicId: id })}
        />
        <EffectCardHand
          cards={player.effectHand}
          selectedId={selection.effectId}
          onSelect={(id) => onChange({ ...selection, effectId: id })}
        />
      </div>
      {summaryNode}
      <div className="cast-divider" />
      <div className="action-buttons">
        <button className="action-button" disabled={!canCast} onClick={cast} data-cast-target="true">
          Cast Spell
        </button>
        <button className="action-button secondary" onClick={() => dispatch({ type: 'END_TURN', playerId: player.id })}>
          End Turn Without Casting
        </button>
      </div>
      {lastError && <p className="action-error">{lastError}</p>}
    </div>
  )
}
