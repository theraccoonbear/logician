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
  return withLog({ ...state, winner: winner.id }, `${winner.name} reaches ${VICTORY_VP} VP and wins!`)
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
    let next: GameState = withLog(
      { ...state, structures: [...state.structures, structure] },
      `${player.name} places a ${action.structureType} during setup.`,
    )

    const playerStructureCount = next.structures.filter((s) => s.owner === player.id).length
    if (playerStructureCount < 3) {
      return ok(next)
    }

    const everyoneDone = next.players.every((p) => next.structures.filter((s) => s.owner === p.id).length >= 3)
    next = everyoneDone
      ? withLog({ ...next, phase: 'build', activePlayerIndex: 0 }, 'Setup complete. Real turns begin.')
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
    const logged = withLog(
      { ...next, structures: fortifiedStructures },
      boosted
        ? `${player.name} builds a Fortress on ${action.hexId} (High Priestess boost), ending their turn.`
        : `${player.name} builds a Fortress on ${action.hexId}, ending their turn.`,
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
  next = withLog(
    { ...next, structures: [...next.structures, structure], phase: 'cast' },
    boosted
      ? `${player.name} builds a ${action.structureType} on ${action.hexId}, boosted by the High Priestess to level ${entryLevel}.`
      : `${player.name} builds a ${action.structureType} on ${action.hexId}.`,
  )
  return ok(checkForWinner(next))
}

function handleSkipBuild(state: GameState, playerId: string): ActionResult {
  const player = requireActivePlayer(state, playerId)
  if (!player) return err('Not the active player')
  if (state.phase !== 'build') return err(`Cannot skip build during phase '${state.phase}'`)
  return ok(withLog({ ...state, phase: 'cast' }, `${player.name} skips building.`))
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
    const draw = drawCards(base.tarotDeck, base.tarotDiscard, 1)
    const next: GameState = {
      ...base,
      tarotDeck: draw.remaining,
      tarotDiscard: [...draw.remainingDiscard, pending.tarot],
      tarotRow: [...base.tarotRow.filter((t) => t.instanceId !== pending.tarot.instanceId), ...draw.drawn],
    }
    const logged = withLog(next, `The Emperor negates the tarot before it could resolve.`)
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
    const logged = withLog(
      result.state,
      `${caster.name} casts a spell: ${result.affectedCount} structure(s) affected, ${result.destroyedCount} destroyed.`,
    )
    return ok(advanceTurn(checkForWinner(logged)))
  }

  const handler = IMMEDIATE_MAJOR_ARCANA_HANDLERS[pending.majorId]
  if (!handler) return err(`${pending.majorId} is not yet implemented`)
  const mergedParams = pending.hierophantOverride
    ? { ...(pending.params as Record<string, unknown>), hierophantOverride: pending.hierophantOverride }
    : pending.params
  const result = handler(base, pending.casterId, pending.tarot, mergedParams)
  if (!result.ok) return err(result.error)
  const logged = withLog(result.state, `${caster.name} plays ${pending.majorId}.`)
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
  return ok(advanceTurn(withLog(state, `${player.name} ends their turn without casting.`)))
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

  const draw = drawCards(state.tarotDeck, state.tarotDiscard, 1)
  let next: GameState = {
    ...state,
    tarotDeck: draw.remaining,
    tarotRow: [...state.tarotRow.filter((t) => t.instanceId !== tarot.instanceId), ...draw.drawn],
  }
  next = withPlayer(next, player.id, (p) => ({ ...p, heldMajorArcana: [...p.heldMajorArcana, tarot] }))
  next = advanceTurn(withLog(next, `${player.name} takes ${tarot.id} to hold for later.`))
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
  next = withLog(next, `${player.name} plays ${card.id} in response.`)

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
  if (remaining.length === 0) {
    return finalizePending(next, state.pendingTrigger)
  }
  return ok(next)
}

function handleSetAssistanceLevel(
  state: GameState,
  action: { playerId: string; assistanceLevel: AssistanceLevel },
): ActionResult {
  const playerExists = state.players.some((p) => p.id === action.playerId)
  if (!playerExists) {
    return err('Player not found')
  }

  const next = withPlayer(state, action.playerId, (p) => ({
    ...p,
    assistanceLevel: action.assistanceLevel,
  }))

  return ok(next)
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
