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

function formatOperand(op: any): string {
  if (op.kind === 'terrain') return op.value
  if (op.kind === 'level') return `Lvl.${op.value}`
  return op.value // StructureType like Pool, Pyramid, Tower, Fortress
}

function formatSubstitutedLogic(logicKind: string, opA: any, opB: any): string {
  const a = formatOperand(opA)
  const b = formatOperand(opB)
  switch (logicKind) {
    case 'A': return `[${a}]`
    case 'NOT_A': return `NOT [${a}]`
    case 'A_AND_B': return `[${a}] AND [${b}]`
    case 'A_OR_B': return `[${a}] OR [${b}]`
    case 'A_XOR_B': return `[${a}] XOR [${b}]`
    case 'A_NOT_B': return `[${a}] AND (NOT [${b}])`
    case 'B_NOT_A': return `[${b}] AND (NOT [${a}])`
    case 'B': return `[${b}]`
    case 'NOT_B': return `NOT [${b}]`
    case 'A_BICON': return `[${a}] <=> [${b}]`
    default: return `[${logicKind}]`
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
  return withLog({ ...state, winner: winner.id }, `GAME_OVER: [${winner.name}] wins with ${computeVP(state, winner.id)} VP`)
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
    const terrain = hex ? hex.terrain : 'Prairies'
    let next: GameState = withLog(
      { ...state, structures: [...state.structures, structure] },
      `[${player.name}] BUILD [${action.structureType}] @ [${terrain}]`,
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
    const terrain = hex ? hex.terrain : 'Prairies'
    const logged = withLog(
      { ...next, structures: fortifiedStructures },
      `[${player.name}] BUILD [Fortress] @ [${terrain}]`,
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
  const terrain = hex ? hex.terrain : 'Prairies'
  next = withLog(
    { ...next, structures: [...next.structures, structure], phase: 'cast' },
    `[${player.name}] BUILD [${action.structureType}] @ [${terrain}]`,
  )
  return ok(checkForWinner(next))
}

function handleSkipBuild(state: GameState, playerId: string): ActionResult {
  const player = requireActivePlayer(state, playerId)
  if (!player) return err('Not the active player')
  if (state.phase !== 'build') return err(`Cannot skip build during phase '${state.phase}'`)
  return ok(withLog({ ...state, phase: 'cast' }, `[${player.name}] SKIP_BUILD`))
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
    const logged = withLog(next, `-> Negated by The Emperor`)
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
    let casterNet = 0
    let opponentNet = 0

    for (const [id, current] of currentStructuresMap.entries()) {
      const nextStruct = nextStructuresMap.get(id)
      const hex = base.board.find((h) => h.id === current.hexId)
      const terrain = hex ? hex.terrain : 'Prairies'
      const owner = base.players.find((p) => p.id === current.owner)!

      if (!nextStruct) {
        changes.push(`-> [${owner.name}]: [${current.type}] Lvl ${current.level} -> destroyed @ [${terrain}]`)
        if (current.owner === caster.id) {
          casterNet -= current.level
        } else {
          opponentNet -= current.level
        }
      } else if (nextStruct.level !== current.level) {
        const delta = nextStruct.level - current.level
        changes.push(`-> [${owner.name}]: [${current.type}] Lvl ${current.level} -> Lvl ${nextStruct.level} @ [${terrain}]`)
        if (current.owner === caster.id) {
          casterNet += delta
        } else {
          opponentNet += delta
        }
      }
    }

    const logicCondition = formatSubstitutedLogic(pending.logicCardKind, pending.operandA, pending.operandB)
    let nextState = withLog(
      result.state,
      `[${caster.name}] CAST [${pending.effectCardKind}] WHERE ${logicCondition}`,
    )

    for (const change of changes) {
      nextState = withLog(nextState, change)
    }

    if (changes.length > 0) {
      const signCaster = casterNet >= 0 ? '+' : ''
      const signOpponent = opponentNet >= 0 ? '+' : ''
      nextState = withLog(nextState, `| Net: ${signCaster}${casterNet} vs ${signOpponent}${opponentNet}`)
    } else {
      nextState = withLog(nextState, `| Net: +0 vs +0`)
    }

    return ok(advanceTurn(checkForWinner(nextState)))
  }

  const handler = IMMEDIATE_MAJOR_ARCANA_HANDLERS[pending.majorId]
  if (!handler) return err(`${pending.majorId} is not yet implemented`)
  const mergedParams = pending.hierophantOverride
    ? { ...(pending.params as Record<string, unknown>), hierophantOverride: pending.hierophantOverride }
    : pending.params
  const result = handler(base, pending.casterId, pending.tarot, mergedParams)
  if (!result.ok) return err(result.error)
  const logged = withLog(result.state, `[${caster.name}] PLAY_MAJOR [${pending.majorId}]`)
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
  return ok(advanceTurn(withLog(state, `[${player.name}] SKIP_CAST`)))
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
  next = advanceTurn(withLog(next, `[${player.name}] HOLD_MAJOR [${tarot.id}]`))
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
  const opponentName = opponent ? opponent.name : 'Opponent'
  next = withLog(next, `[${player.name}] PLAY_HELD_MAJOR [${card.id}] in response to [${opponentName}]'s [CAST]`)

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

  const player = state.players.find((p) => p.id === action.playerId)
  const playerName = player ? player.name : 'Player'

  const remaining = state.triggerQueue.slice(1)
  const next: GameState = { ...state, triggerQueue: remaining }
  const logged = withLog(next, `[${playerName}] PASS_TRIGGER`)
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

  const logged = withLog(next, `[${player.name}] SET_ASSISTANCE [${action.assistanceLevel}]`)
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
