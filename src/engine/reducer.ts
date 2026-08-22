import { IMMEDIATE_MAJOR_ARCANA_HANDLERS } from './majorArcana/registry'
import { canBuildBasic, canBuildFortress, computeVP } from './selectors'
import { resolveSpell, setFortressedForHex } from './spellResolution'
import { HOLD_CARD_HANDLERS, computeTriggerQueue, isHoldCard } from './triggers'
import { drawCards } from './decks'
import type { ActionResult, GameAction } from './types/actions'
import type { GameState, PendingResolution, Player, AssistanceLevel } from './types/state'
import type { Structure } from './types/structure'
import { LEVEL_BOUNDS } from './types/structure'

const VICTORY_VP = 40

/**
 * Unified LGN token stringification helper.
 * Formats various game entities cleanly and systematically into easily parseable LGN tokens.
 */
export function toLGNToken(type: 'player', value: string): string;
export function toLGNToken(type: 'terrain', value: string, hexId?: string, board?: any[]): string;
export function toLGNToken(type: 'structure', value: string): string;
export function toLGNToken(type: 'tarot', value: string): string;
export function toLGNToken(type: 'logic', value: string): string;
export function toLGNToken(type: 'effect', value: string): string;
export function toLGNToken(type: 'operand', value: any): string;
export function toLGNToken(type: 'level', value: number | string): string;
export function toLGNToken(type: string, value: any, extra1?: any, extra2?: any): string {
  switch (type) {
    case 'player': {
      const match = String(value).match(/\d+/)
      return match ? `p:${match[0]}` : `p:${value}`
    }
    case 'terrain': {
      const terrain = String(value)
      const hexId = extra1 as string | undefined
      const board = extra2 as any[] | undefined
      let suffix = ''
      if (hexId && board) {
        const index = board.findIndex((h) => h.id === hexId)
        if (index !== -1) {
          suffix = `:${index + 1}`
        }
      }
      switch (terrain) {
        case 'Mountains': return `g:m${suffix}`
        case 'Swamps': return `g:s${suffix}`
        case 'Forests': return `g:f${suffix}`
        case 'Prairies': return `g:p${suffix}`
        default: return `g:${terrain}${suffix}`
      }
    }
    case 'structure': {
      switch (value) {
        case 'Tower': return 'b:t'
        case 'Pool': return 'b:p'
        case 'Pyramid': return 'b:y'
        case 'Fortress': return 'b:f'
        default: return `b:${value}`
      }
    }
    case 'tarot': {
      return `t:${String(value).toUpperCase().replace(/[\s-]/g, '_')}`
    }
    case 'logic': {
      return `l:${value}`
    }
    case 'effect': {
      return `e:${value}`
    }
    case 'level': {
      return `v:${value}`
    }
    case 'operand': {
      if (!value) return ''
      if (value.kind === 'terrain') return toLGNToken('terrain', value.value)
      if (value.kind === 'level') return toLGNToken('level', value.value)
      if (value.kind === 'structureType' || value.kind === 'structure') {
        return toLGNToken('structure', value.value)
      }
      return String(value.value)
    }
    default:
      return String(value)
  }
}

function formatSubstitutedLogic(logicKind: string, opA: any, opB: any): string {
  const a = toLGNToken('operand', opA)
  const b = toLGNToken('operand', opB)
  const logicToken = toLGNToken('logic', logicKind)
  switch (logicKind) {
    case 'A':
    case 'NOT_A':
      return `${logicToken} ${a}`
    case 'B':
    case 'NOT_B':
      return `${logicToken} ${b}`
    case 'B_NOT_A':
      return `${logicToken} ${b} ${a}`
    case 'A_AND_B':
    case 'A_OR_B':
    case 'A_XOR_B':
    case 'A_NOT_B':
    case 'A_NOR_B':
    case 'A_BICON':
      return `${logicToken} ${a} ${b}`
    default:
      return `${logicToken} ${a} ${b}`
  }
}

function err(error: string): ActionResult {
  return { ok: false, error }
}

function ok(state: GameState): ActionResult {
  return { ok: true, state }
}

function activePlayer(state: GameState): Player {
  return state.players[state.activePlayerIndex]
}

function requireActivePlayer(state: GameState, playerId: string): Player | null {
  const player = activePlayer(state)
  return player.id === playerId ? player : null
}

function withPlayer(state: GameState, playerId: string, update: (player: Player) => Player): GameState {
  return { ...state, players: state.players.map((p) => (p.id === playerId ? update(p) : p)) }
}

function withLog(state: GameState, message: string): GameState {
  return { ...state, log: [...state.log, { message }] }
}

function findInHand<T extends { instanceId: string }>(hand: T[], instanceId: string): T | undefined {
  return hand.find((c) => c.instanceId === instanceId)
}

/** Advances to the next player and resets to the 'build' phase for their turn. */
function advanceTurn(state: GameState): GameState {
  const nextIndex = (state.activePlayerIndex + 1) % state.players.length
  return { ...state, activePlayerIndex: nextIndex, phase: 'build' }
}

function checkForWinner(state: GameState): GameState {
  if (state.winner) return state
  const winner = state.players.find((p) => computeVP(state, p.id) >= VICTORY_VP)
  if (!winner) return state
  const scoresStr = state.players.map((p) => `${toLGNToken('player', p.id)}: ${computeVP(state, p.id)}`).join(', ')
  return withLog(
    { ...state, winner: winner.id },
    `GAME_OVER: ${toLGNToken('player', winner.id)} wins with ${computeVP(state, winner.id)} VP | Scores: ${scoresStr}`,
  )
}

function handleBuildStructure(
  state: GameState,
  action: { playerId: string; hexId: string; structureType: Structure['type']; playHighPriestessCardId?: string },
 ): ActionResult {
  const player = requireActivePlayer(state, action.playerId)
  if (!player) return err('Not the active player')
  if (!state.board.some((h) => h.id === action.hexId)) return err('Unknown hex')

  if (state.phase === 'setup') {
    if (action.structureType === 'Fortress') return err('Cannot build a Fortress during setup')
    const alreadyOwnsType = state.structures.some((s) => s.owner === player.id && s.type === action.structureType)
    if (alreadyOwnsType) return err(`${player.name} has already placed their ${action.structureType} during setup`)

    const structure: Structure = {
      id: crypto.randomUUID(),
      type: action.structureType,
      owner: player.id,
      hexId: action.hexId,
      level: LEVEL_BOUNDS[action.structureType].floor,
      fortressed: false,
    }
    const hex = state.board.find((h) => h.id === action.hexId)
    const terrainStr = hex ? toLGNToken('terrain', hex.terrain, action.hexId, state.board) : 'g:?'
    let next: GameState = withLog(
      { ...state, structures: [...state.structures, structure] },
      `${toLGNToken('player', player.id)} BUILD ${toLGNToken('structure', action.structureType)} @ ${terrainStr}`,
    )

    const playerStructureCount = next.structures.filter((s) => s.owner === player.id).length
    if (playerStructureCount < 3) {
      return ok(next)
    }

    const everyoneDone = next.players.every((p) => next.structures.filter((s) => s.owner === p.id).length >= 3)
    next = everyoneDone
      ? withLog({ ...next, phase: 'build', activePlayerIndex: 0 }, 'SETUP_COMPLETE')
      : { ...next, activePlayerIndex: (next.activePlayerIndex + 1) % next.players.length }
    return ok(next)
  }

  if (state.phase !== 'build') return err(`Cannot build during phase '${state.phase}'`)

  let next: GameState = state
  let boosted = false
  if (action.playHighPriestessCardId) {
    const card = findInHand(player.heldMajorArcana, action.playHighPriestessCardId)
    if (!card || card.id !== 'HIGH_PRIESTESS') return err('You are not holding the High Priestess')
    boosted = true
    next = withPlayer(next, player.id, (p) => ({
      ...p,
      heldMajorArcana: p.heldMajorArcana.filter((c) => c.instanceId !== card.instanceId),
    }))
    next = { ...next, tarotDiscard: [...next.tarotDiscard, card] }
  }

  if (action.structureType === 'Fortress') {
    if (!canBuildFortress(state, player.id, action.hexId)) {
      return err('Fortress requires an existing Pool, Pyramid, and Tower you own on this hex')
    }
    const fortress: Structure = {
      id: crypto.randomUUID(),
      type: 'Fortress',
      owner: player.id,
      hexId: action.hexId,
      level: boosted ? 2 : LEVEL_BOUNDS.Fortress.floor,
      fortressed: false,
    }
    const fortifiedStructures = setFortressedForHex([...next.structures, fortress], player.id, action.hexId, true)
    const hex = state.board.find((h) => h.id === action.hexId)
    const terrainStr = hex ? toLGNToken('terrain', hex.terrain, action.hexId, state.board) : 'g:?'
    const logged = withLog(
      { ...next, structures: fortifiedStructures },
      `${toLGNToken('player', player.id)} BUILD ${toLGNToken('structure', 'Fortress')} @ ${terrainStr}`,
    )
    return ok(checkForWinner(advanceTurn(logged)))
  }

  if (!canBuildBasic(state, player.id, action.hexId, action.structureType)) {
    return err(`You already have a ${action.structureType} on this hex`)
  }

  // Boosted entry is capped at the structure's own max (relevant for Fortress, whose max is only 2).
  const entryLevel = boosted ? Math.min(3, LEVEL_BOUNDS[action.structureType].max) : LEVEL_BOUNDS[action.structureType].floor
  const structure: Structure = {
    id: crypto.randomUUID(),
    type: action.structureType,
    owner: player.id,
    hexId: action.hexId,
    level: entryLevel,
    fortressed: false,
  }
  const hex = state.board.find((h) => h.id === action.hexId)
  const terrainStr = hex ? toLGNToken('terrain', hex.terrain, action.hexId, state.board) : '[g:?]'
  next = withLog(
    { ...next, structures: [...next.structures, structure], phase: 'cast' },
    `${toLGNToken('player', player.id)} BUILD ${toLGNToken('structure', action.structureType)} @ ${terrainStr}`,
  )
  return ok(checkForWinner(next))
}

function handleSkipBuild(state: GameState, playerId: string): ActionResult {
  const player = requireActivePlayer(state, playerId)
  if (!player) return err('Not the active player')
  if (state.phase !== 'build') return err(`Cannot skip build during phase '${state.phase}'`)
  return ok(withLog({ ...state, phase: 'cast' }, `${toLGNToken('player', player.id)} SKIP_BUILD`))
}

/** Either resolves immediately (nobody can react) or opens an 'awaitingTrigger' window. */
function initiatePendingResolution(state: GameState, pending: PendingResolution): ActionResult {
  const queue = computeTriggerQueue(state, pending)
  if (queue.length === 0) {
    return finalizePending(state, pending)
  }
  const next = withLog(
    { ...state, phase: 'awaitingTrigger', pendingTrigger: pending, triggerQueue: queue },
    `Waiting for a possible held-card response before resolving...`,
  )
  return ok(next)
}

function finalizePending(state: GameState, pending: PendingResolution): ActionResult {
  const base: GameState = { ...state, pendingTrigger: undefined, triggerQueue: undefined }
  const caster = base.players.find((p) => p.id === pending.casterId)
  if (!caster) return err('Unknown caster')

  if (pending.cancelled) {
    const draw = drawCards(base.tarotDeck, base.tarotDiscard, 1, base.prng)
    const next: GameState = {
      ...base,
      tarotDeck: draw.remaining,
      tarotDiscard: [...draw.remainingDiscard, pending.tarot],
      tarotRow: [...base.tarotRow.filter((t) => t.instanceId !== pending.tarot.instanceId), ...draw.drawn],
      prng: draw.prng,
    }
    const logged = withLog(next, `-> Negated by ${toLGNToken('tarot', 'EMPEROR')}`)
    return ok(advanceTurn(checkForWinner(logged)))
  }

  if (pending.kind === 'spell') {
    const result = resolveSpell(base, {
      casterId: pending.casterId,
      logicCardId: pending.logicCardInstanceId,
      effectCardId: pending.effectCardInstanceId,
      operandA: pending.operandA,
      operandB: pending.operandB,
      tarot: pending.tarot,
      hierophantOverride: pending.hierophantOverride,
    })
    if (!result.ok) return err(result.error)

    const currentStructuresMap = new Map(base.structures.map((s) => [s.id, s]))
    const nextStructuresMap = new Map(result.state.structures.map((s) => [s.id, s]))

    const changes: string[] = []

    for (const [id, current] of currentStructuresMap.entries()) {
      const nextStruct = nextStructuresMap.get(id)
      const hex = base.board.find((h) => h.id === current.hexId)
      const terrainStr = hex ? toLGNToken('terrain', hex.terrain, current.hexId, base.board) : 'g:?'
      const owner = base.players.find((p) => p.id === current.owner)!

      if (!nextStruct) {
        changes.push(`-> ${toLGNToken('player', owner.id)}: ${toLGNToken('structure', current.type)} ${toLGNToken('level', current.level)} -> destroyed @ ${terrainStr}`)
      } else if (nextStruct.level !== current.level) {
        changes.push(`-> ${toLGNToken('player', owner.id)}: ${toLGNToken('structure', current.type)} ${toLGNToken('level', current.level)} -> ${toLGNToken('level', nextStruct.level)} @ ${terrainStr}`)
      }
    }

    const logicCondition = formatSubstitutedLogic(pending.logicCardKind, pending.operandA, pending.operandB)
    let nextState = withLog(
      result.state,
      `${toLGNToken('player', caster.id)} CAST ${toLGNToken('effect', pending.effectCardKind)} WHERE ${logicCondition}`,
    )

    for (const change of changes) {
      nextState = withLog(nextState, change)
    }

    // Log the drawn Logic/Effect cards to make the log complete and deterministic
    const prePlayer = base.players.find((p) => p.id === pending.casterId)!
    const postPlayer = result.state.players.find((p) => p.id === pending.casterId)!
    const preLogicIds = new Set(prePlayer.logicHand.map((c) => c.instanceId))
    const drawnLogic = postPlayer.logicHand.filter((c) => !preLogicIds.has(c.instanceId))
    const preEffectIds = new Set(prePlayer.effectHand.map((c) => c.instanceId))
    const drawnEffect = postPlayer.effectHand.filter((c) => !preEffectIds.has(c.instanceId))

    if (drawnLogic.length > 0 || drawnEffect.length > 0) {
      const drawLogicStr = drawnLogic.map((c) => toLGNToken('logic', c.kind)).join(', ')
      const drawEffectStr = drawnEffect.map((c) => toLGNToken('effect', c.kind)).join(', ')
      const drawParts = []
      if (drawLogicStr) drawParts.push(drawLogicStr)
      if (drawEffectStr) drawParts.push(drawEffectStr)
      nextState = withLog(nextState, `${toLGNToken('player', caster.id)} DRAW ${drawParts.join(' + ')}`)
    }

    // Terse player mapping with named net score logs
    const netDetails = base.players.map((p) => {
      let playerNet = 0
      for (const [id, current] of currentStructuresMap.entries()) {
        if (current.owner !== p.id) continue
        const nextStruct = nextStructuresMap.get(id)
        if (!nextStruct) {
          playerNet -= current.level
        } else if (nextStruct.level !== current.level) {
          playerNet += nextStruct.level - current.level
        }
      }
      const sign = playerNet >= 0 ? '+' : ''
      return `${toLGNToken('player', p.id)}: ${sign}${playerNet}`
    }).join(', ')

    nextState = withLog(nextState, `| Net: ${netDetails}`)

    return ok(advanceTurn(checkForWinner(nextState)))
  }

  const handler = IMMEDIATE_MAJOR_ARCANA_HANDLERS[pending.majorId]
  if (!handler) return err(`${pending.majorId} is not yet implemented`)
  const mergedParams = pending.hierophantOverride
    ? { ...(pending.params as Record<string, unknown>), hierophantOverride: pending.hierophantOverride }
    : pending.params
  const result = handler(base, pending.casterId, pending.tarot, mergedParams)
  if (!result.ok) return err(result.error)
  const logged = withLog(result.state, `${toLGNToken('player', caster.id)} PLAY_MAJOR ${toLGNToken('tarot', pending.majorId)}`)
  return ok(advanceTurn(checkForWinner(logged)))
}

function handleCastSpell(
  state: GameState,
  action: { playerId: string; logicCardId: string; effectCardId: string; tarotId: string },
): ActionResult {
  const player = requireActivePlayer(state, action.playerId)
  if (!player) return err('Not the active player')
  if (state.phase !== 'cast') return err(`Cannot cast during phase '${state.phase}'`)

  const logicCard = findInHand(player.logicHand, action.logicCardId)
  if (!logicCard) return err('Logic card not in hand')
  const effectCard = findInHand(player.effectHand, action.effectCardId)
  if (!effectCard) return err('Effect card not in hand')
  const tarot = state.tarotRow.find((t) => t.instanceId === action.tarotId)
  if (!tarot) return err('Tarot card not in the active row')
  if (tarot.kind !== 'minor') return err('Major Arcana tarot resolution is not yet supported')

  const pending: PendingResolution = {
    kind: 'spell',
    casterId: player.id,
    logicCardInstanceId: logicCard.instanceId,
    logicCardKind: logicCard.kind,
    effectCardInstanceId: effectCard.instanceId,
    effectCardKind: effectCard.kind,
    tarot,
    operandA: tarot.operandA,
    operandB: tarot.operandB,
  }
  return initiatePendingResolution(state, pending)
}

function handleEndTurn(state: GameState, playerId: string): ActionResult {
  const player = requireActivePlayer(state, playerId)
  if (!player) return err('Not the active player')
  if (state.phase !== 'cast') return err(`Cannot pass phase 2 during phase '${state.phase}'`)
  return ok(advanceTurn(withLog(state, `${toLGNToken('player', player.id)} SKIP_CAST`)))
}

function handlePlayMajorArcana(state: GameState, action: { playerId: string; tarotId: string; params?: unknown }): ActionResult {
  const player = requireActivePlayer(state, action.playerId)
  if (!player) return err('Not the active player')
  if (state.phase !== 'cast') return err(`Cannot play a Major Arcana action during phase '${state.phase}'`)

  const tarot = state.tarotRow.find((t) => t.instanceId === action.tarotId)
  if (!tarot) return err('Tarot card not in the active row')
  if (tarot.kind !== 'major') return err('That tarot card is not a Major Arcana')
  if (isHoldCard(tarot.id) || tarot.id === 'HIGH_PRIESTESS') {
    return err(`${tarot.id} must be taken and held for later use (TAKE_HOLD_CARD), not played directly`)
  }
  if (!IMMEDIATE_MAJOR_ARCANA_HANDLERS[tarot.id]) return err(`${tarot.id} is not yet implemented`)

  const pending: PendingResolution = { kind: 'majorAction', casterId: player.id, majorId: tarot.id, tarot, params: action.params }
  return initiatePendingResolution(state, pending)
}

function handleTakeHoldCard(state: GameState, action: { playerId: string; tarotId: string }): ActionResult {
  const player = requireActivePlayer(state, action.playerId)
  if (!player) return err('Not the active player')
  if (state.phase !== 'cast') return err(`Cannot take a hold card during phase '${state.phase}'`)

  const tarot = state.tarotRow.find((t) => t.instanceId === action.tarotId)
  if (!tarot) return err('Tarot card not in the active row')
  if (tarot.kind !== 'major') return err('Only Major Arcana can be held')
  if (!isHoldCard(tarot.id) && tarot.id !== 'HIGH_PRIESTESS') return err(`${tarot.id} resolves immediately and cannot be held`)

  const draw = drawCards(state.tarotDeck, state.tarotDiscard, 1, state.prng)
  let next: GameState = {
    ...state,
    tarotDeck: draw.remaining,
    tarotRow: [...state.tarotRow.filter((t) => t.instanceId !== tarot.instanceId), ...draw.drawn],
    prng: draw.prng,
  }
  next = withPlayer(next, player.id, (p) => ({ ...p, heldMajorArcana: [...p.heldMajorArcana, tarot] }))
  next = advanceTurn(withLog(next, `${toLGNToken('player', player.id)} HOLD_MAJOR ${toLGNToken('tarot', tarot.id)}`))
  return ok(next)
}

function handlePlayHeldArcana(state: GameState, action: { playerId: string; cardId: string; params?: unknown }): ActionResult {
  if (state.phase !== 'awaitingTrigger' || !state.pendingTrigger || !state.triggerQueue?.length) {
    return err('No trigger window is currently open')
  }
  const responderId = state.triggerQueue[0]
  if (action.playerId !== responderId) return err('Not your turn to respond')

  const player = state.players.find((p) => p.id === action.playerId)
  if (!player) return err('Unknown player')
  const card = findInHand(player.heldMajorArcana, action.cardId)
  if (!card) return err('You are not holding that card')
  const handler = HOLD_CARD_HANDLERS[card.id]
  if (!handler || !handler.canRespond(state.pendingTrigger, player.id)) {
    return err('That card cannot respond to this resolution')
  }

  const transformed = handler.transform(state.pendingTrigger, player.id, action.params)
  let next: GameState = withPlayer(state, player.id, (p) => ({
    ...p,
    heldMajorArcana: p.heldMajorArcana.filter((c) => c.instanceId !== card.instanceId),
  }))
  next = {
    ...next,
    tarotDiscard: [...next.tarotDiscard, card],
    pendingTrigger: transformed,
    triggerQueue: state.triggerQueue.slice(1),
  }
  const opponent = state.players.find((p) => p.id === state.pendingTrigger?.casterId)
  const opponentIdStr = opponent ? toLGNToken('player', opponent.id) : 'p:?'
  next = withLog(next, `${toLGNToken('player', player.id)} PLAY_HELD_MAJOR ${toLGNToken('tarot', card.id)} in response to ${opponentIdStr}'s CAST`)

  if (transformed.cancelled || next.triggerQueue!.length === 0) {
    return finalizePending(next, transformed)
  }
  return ok(next)
}

function handlePassTriggerWindow(state: GameState, action: { playerId: string }): ActionResult {
  if (state.phase !== 'awaitingTrigger' || !state.pendingTrigger || !state.triggerQueue?.length) {
    return err('No trigger window is currently open')
  }
  const responderId = state.triggerQueue[0]
  if (action.playerId !== responderId) return err('Not your turn to respond')

  const remaining = state.triggerQueue.slice(1)
  const next: GameState = { ...state, triggerQueue: remaining }
  const logged = withLog(next, `${toLGNToken('player', action.playerId)} PASS_TRIGGER`)
  if (remaining.length === 0) {
    return finalizePending(logged, state.pendingTrigger)
  }
  return ok(logged)
}

function handleSetAssistanceLevel(
  state: GameState,
  action: { playerId: string; assistanceLevel: AssistanceLevel },
): ActionResult {
  const player = state.players.find((p) => p.id === action.playerId)
  if (!player) {
    return err('Player not found')
  }

  const next = withPlayer(state, action.playerId, (p) => ({
    ...p,
    assistanceLevel: action.assistanceLevel,
  }))

  const logged = withLog(next, `${toLGNToken('player', player.id)} SET_ASSISTANCE ${action.assistanceLevel}`)
  return ok(logged)
}

export function applyAction(state: GameState, action: GameAction): ActionResult {
  switch (action.type) {
    case 'BUILD_STRUCTURE':
      return handleBuildStructure(state, action)
    case 'SKIP_BUILD':
      return handleSkipBuild(state, action.playerId)
    case 'CAST_SPELL':
      return handleCastSpell(state, action)
    case 'END_TURN':
      return handleEndTurn(state, action.playerId)
    case 'PLAY_MAJOR_ARCANA':
      return handlePlayMajorArcana(state, action)
    case 'TAKE_HOLD_CARD':
      return handleTakeHoldCard(state, action)
    case 'PLAY_HELD_ARCANA':
      return handlePlayHeldArcana(state, action)
      case 'PASS_TRIGGER_WINDOW':
        return handlePassTriggerWindow(state, action)
      case 'SET_ASSISTANCE_LEVEL':
        return handleSetAssistanceLevel(state, action)
  }
}
