import { createInitialGameState } from '../src/engine/setup'
import { applyAction } from '../src/engine/reducer'
import { createAI } from '../src/engine/ai'
import { computeVP } from '../src/engine/selectors'
import type { GameAction } from '../src/engine/types/actions'

const VALID_AGENTS = ['random', 'heuristic', 'optimus'] as const

function printHelp() {
  console.log(`
Logician AI-vs-AI Simulator

Usage:
  npm run sim <agent-id-1> <agent-id-2> [options]

Agent IDs:
  * random      - Plays completely random legal moves
  * heuristic   - Greedily selects the action with the highest one-ply score
  * optimus     - Advanced lookahead, expects samples, reactions, drafts, and high-IQ play

Options:
  --delay <ms>   Delay between log prints in milliseconds (default: 50)
  --max-turns <n> Maximum number of game engine steps (default: 1000)

Examples:
  npm run sim heuristic optimus
  npm run sim optimus optimus --delay 30
`)
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function resolveAgent(input: string): string {
  const matches = VALID_AGENTS.filter((a) => a.toLowerCase().startsWith(input.toLowerCase()))
  if (matches.length === 1) {
    return matches[0]
  }
  if (matches.length === 0) {
    console.error(`Error: No agent matches prefix "${input}".`)
    console.error(`Valid agents are: ${VALID_AGENTS.join(', ')}`)
    printHelp()
    process.exit(1)
  }
  console.error(`Error: Ambiguous agent prefix "${input}". Matches multiple: ${matches.join(', ')}`)
  printHelp()
  process.exit(1)
}

async function run() {
  const args = process.argv.slice(2)

  if (args.includes('/help') || args.includes('--help') || args.includes('-h') || args.length < 2) {
    printHelp()
    process.exit(0)
  }

  const [agent1Input, agent2Input] = args
  const agent1 = resolveAgent(agent1Input)
  const agent2 = resolveAgent(agent2Input)

  let delayMs = 50
  const delayIndex = args.indexOf('--delay')
  if (delayIndex !== -1 && args[delayIndex + 1]) {
    delayMs = parseInt(args[delayIndex + 1], 10)
  }

  let maxTurns = 1000
  const maxTurnsIndex = args.indexOf('--max-turns')
  if (maxTurnsIndex !== -1 && args[maxTurnsIndex + 1]) {
    maxTurns = parseInt(args[maxTurnsIndex + 1], 10)
  }

  console.log(`========================================`)
  console.log(`Initializing game: ${agent1} vs ${agent2}...`)
  console.log(`========================================\n`)
  await sleep(500)

  let state = createInitialGameState([
    { name: `Hugh`, isAI: true, aiDifficulty: agent1 as any },
    { name: `Opti`, isAI: true, aiDifficulty: agent2 as any },
  ])

  let lastPrintedLogIndex = 0

  const printNewLogs = async () => {
    while (lastPrintedLogIndex < state.log.length) {
      console.log(state.log[lastPrintedLogIndex].message)
      lastPrintedLogIndex++
      if (delayMs > 0) {
        await sleep(delayMs)
      }
    }
  }

  await printNewLogs()

  let turns = 0
  while (!state.winner && turns < maxTurns) {
    const player = state.players[state.activePlayerIndex]
    const ai = createAI(player.aiDifficulty!)

    let action: GameAction | null = null

    if (state.phase === 'setup' || state.phase === 'build') {
      action = ai.chooseBuildAction(state, player.id)
    } else if (state.phase === 'cast') {
      action = ai.chooseCastAction(state, player.id)
    } else if (state.phase === 'awaitingTrigger') {
      const responderId = state.triggerQueue![0]
      const responderAI = createAI(state.players.find((p) => p.id === responderId)!.aiDifficulty!)
      action = responderAI.respondToTriggerWindow(state, responderId)
    }

    if (!action) {
      console.error('AI failed to select a legal action')
      break
    }

    const result = applyAction(state, action)
    if (!result.ok) {
      console.error(`AI generated illegal action: ${JSON.stringify(action)}. Error: ${result.error}`)
      break
    }

    state = result.state
    turns++

    await printNewLogs()
  }

  if (state.winner) {
    const winnerPlayer = state.players.find((p) => p.id === state.winner)
    console.log(`\n========================================`)
    console.log(`GAME OVER!`)
    console.log(`Winner: ${winnerPlayer?.name} (${winnerPlayer?.aiDifficulty})`)
    const scoresStr = state.players.map((p) => `${p.name} (${p.aiDifficulty}): ${computeVP(state, p.id)} VP`).join(', ')
    console.log(`Final Scores: ${scoresStr}`)
    console.log(`Tarot Row at end: ${state.tarotRow.map((t) => t.kind === 'minor' ? `${t.rank}_of_${t.suit}` : t.id).join(', ')}`)
    console.log(`========================================\n`)
  } else if (turns >= maxTurns) {
    console.log(`\n========================================`)
    console.log(`GAME OVER! Reached maximum turns limit (${maxTurns})`)
    const scoresStr = state.players.map((p) => `${p.name} (${p.aiDifficulty}): ${computeVP(state, p.id)} VP`).join(', ')
    console.log(`Final Scores: ${scoresStr}`)
    console.log(`Tarot Row at end: ${state.tarotRow.map((t) => t.kind === 'minor' ? `${t.rank}_of_${t.suit}` : t.id).join(', ')}`)
    console.log(`========================================\n`)
  }
}

run().catch((err) => {
  console.error('Simulation error:', err)
  process.exit(1)
})
