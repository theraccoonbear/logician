import { createInitialGameState } from '../src/engine/setup'
import { applyAction } from '../src/engine/reducer'
import { createAI } from '../src/engine/ai'
import { computeVP } from '../src/engine/selectors'
import type { GameAction } from '../src/engine/types/actions'

const VALID_AGENTS = ['random', 'heuristic', 'optimus'] as const

function printHelp() {
  console.log(`
Logician AI-vs-AI Head-to-Head Benchmarking Harness

Usage:
  npm run benchmark <agent-id-1> <agent-id-2> [games-count] [options]

Agent IDs:
  * random      - Plays completely random legal moves
  * heuristic   - Greedily selects the action with the highest one-ply score
  * optimus     - Advanced lookahead, expects samples, reactions, drafts, and high-IQ play

Options:
  --max-turns <n> Maximum number of game engine steps per game (default: 500)

Examples:
  npm run benchmark optimus optimus 100
  npm run benchmark heuristic heuristic 50 --max-turns 300
`)
}

function resolveAgent(input: string): string {
  const matches = VALID_AGENTS.filter((a) => a.toLowerCase().startsWith(input.toLowerCase()))
  if (matches.length === 1) {
    return matches[0]
  }
  if (matches.length === 0) {
    console.error(`Error: No agent matches prefix "${input}".`)
    printHelp()
    process.exit(1)
  }
  console.error(`Error: Ambiguous agent prefix "${input}". Matches multiple: ${matches.join(', ')}`)
  printHelp()
  process.exit(1)
}

function getMedian(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const half = Math.floor(sorted.length / 2)
  if (sorted.length % 2 !== 0) {
    return sorted[half]
  }
  return (sorted[half - 1] + sorted[half]) / 2.0
}

function getStdDev(values: number[], mean: number): number {
  if (values.length <= 1) return 0
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1)
  return Math.sqrt(variance)
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

  let gamesCount = 100
  if (args[2] && !args[2].startsWith('--')) {
    gamesCount = parseInt(args[2], 10)
    if (isNaN(gamesCount) || gamesCount <= 0) {
      console.error(`Error: Invalid games-count "${args[2]}". Must be a positive integer.`)
      process.exit(1)
    }
  }

  let maxTurns = 500
  const maxTurnsIndex = args.indexOf('--max-turns')
  if (maxTurnsIndex !== -1 && args[maxTurnsIndex + 1]) {
    maxTurns = parseInt(args[maxTurnsIndex + 1], 10)
  }

  console.log(`================================================================================`)
  console.log(`Starting Benchmark: Player 1 (${agent1}) vs Player 2 (${agent2})`)
  console.log(`Running ${gamesCount} games (max turns per game: ${maxTurns})`)
  console.log(`================================================================================\n`)

  let p1Wins = 0
  let p2Wins = 0
  let timeouts = 0
  let totalTurns = 0
  let p1TotalScore = 0
  let p2TotalScore = 0
  let totalWinMargin = 0
  let illegalMoves = 0

  const turnCounts: number[] = []
  const p1Scores: number[] = []
  const p2Scores: number[] = []

  for (let g = 1; g <= gamesCount; g++) {
    let state = createInitialGameState([
      { name: `P1_First`, isAI: true, aiDifficulty: agent1 as any },
      { name: `P2_Second`, isAI: true, aiDifficulty: agent2 as any },
    ])

    const p1Id = state.players[0].id
    const p2Id = state.players[1].id

    let turns = 0
    let _gameEnded = false
    let aborted = false

    while (!state.winner && turns < maxTurns) {
      const activePlayer = state.players[state.activePlayerIndex]
      const ai = createAI(activePlayer.aiDifficulty!)

      let action: GameAction | null = null

      if (state.phase === 'setup' || state.phase === 'build') {
        action = ai.chooseBuildAction(state, activePlayer.id)
      } else if (state.phase === 'cast') {
        action = ai.chooseCastAction(state, activePlayer.id)
      } else if (state.phase === 'awaitingTrigger') {
        const responderId = state.triggerQueue![0]
        const responderAI = createAI(state.players.find((p) => p.id === responderId)!.aiDifficulty!)
        action = responderAI.respondToTriggerWindow(state, responderId)
      }

      if (!action) {
        console.error(`[Game ${g}] AI active player ${activePlayer.name} failed to generate an action.`)
        aborted = true
        break
      }

      const result = applyAction(state, action)
      if (!result.ok) {
        console.error(`[Game ${g}] AI generated illegal action: ${JSON.stringify(action)}. Error: ${result.error}`)
        illegalMoves++
        aborted = true
        break
      }

      state = result.state
      turns++
    }

    if (aborted) {
      continue
    }

    const p1Score = computeVP(state, p1Id)
    const p2Score = computeVP(state, p2Id)

    p1TotalScore += p1Score
    p2TotalScore += p2Score
    totalTurns += turns

    turnCounts.push(turns)
    p1Scores.push(p1Score)
    p2Scores.push(p2Score)

    let winnerName = ''
    if (state.winner) {
      _gameEnded = true
      if (state.winner === p1Id) {
        p1Wins++
        winnerName = 'P1'
      } else {
        p2Wins++
        winnerName = 'P2'
      }
      totalWinMargin += Math.abs(p1Score - p2Score)
    } else {
      timeouts++
      // For timeout tie-breaker stats
      if (p1Score > p2Score) {
        winnerName = 'P1 (on points)'
        p1Wins++
      } else if (p2Score > p1Score) {
        winnerName = 'P2 (on points)'
        p2Wins++
      } else {
        winnerName = 'TIE (on points)'
      }
      totalWinMargin += Math.abs(p1Score - p2Score)
    }

    console.log(`Game ${g.toString().padStart(3)}/${gamesCount}: ${winnerName.padEnd(14)} | Score: ${p1Score.toString().padStart(2)}-${p2Score.toString().padStart(2)} | Turns: ${turns.toString().padStart(3)}`)
  }

  const completedGames = gamesCount - illegalMoves
  if (completedGames === 0) {
    console.error('All games aborted due to illegal actions or errors.')
    process.exit(1)
  }

  const p1WinRate = (p1Wins / completedGames) * 100
  const p2WinRate = (p2Wins / completedGames) * 100
  const timeoutRate = (timeouts / completedGames) * 100
  const avgTurns = totalTurns / completedGames
  const avgP1Score = p1TotalScore / completedGames
  const avgP2Score = p2TotalScore / completedGames
  const avgMargin = totalWinMargin / completedGames

  const minTurns = Math.min(...turnCounts)
  const maxTurnsActual = Math.max(...turnCounts)
  const medianTurns = getMedian(turnCounts)
  const stdDevTurns = getStdDev(turnCounts, avgTurns)

  const maxScore = Math.max(...p1Scores, ...p2Scores)
  const minScore = Math.min(...p1Scores, ...p2Scores)
  const naturalVictories = completedGames - timeouts
  const naturalVictoryRate = (naturalVictories / completedGames) * 100

  console.log(`\n================================================================================`)
  console.log(`BENCHMARK RESULTS`)
  console.log(`================================================================================`)
  console.log(`Scenario: ${agent1.toUpperCase()} (P1_First) vs ${agent2.toUpperCase()} (P2_Second)`)
  console.log(`Total Games Successfully Run: ${completedGames}`)
  console.log(`Max Turns Limit per Game:      ${maxTurns}`)
  console.log(`--------------------------------------------------------------------------------`)
  console.log(`Win / Lose Records:`)
  console.log(`  Player 1 (First Mover) Wins:   ${p1Wins} / ${completedGames} (${p1WinRate.toFixed(1)}%)`)
  console.log(`  Player 2 (Second Mover) Wins:  ${p2Wins} / ${completedGames} (${p2WinRate.toFixed(1)}%)`)
  console.log(`--------------------------------------------------------------------------------`)
  console.log(`Game Duration (Turns):`)
  console.log(`  Average Turns per Game:        ${avgTurns.toFixed(1)}`)
  console.log(`  Median Turns per Game:         ${medianTurns.toFixed(1)}`)
  console.log(`  Min / Max Game Duration:       ${minTurns} / ${maxTurnsActual} turns`)
  console.log(`  Std Dev of Game Length:        ${stdDevTurns.toFixed(1)} turns`)
  console.log(`--------------------------------------------------------------------------------`)
  console.log(`Victory Conditions:`)
  console.log(`  Natural Victories (>=40 VP):   ${naturalVictories} / ${completedGames} (${naturalVictoryRate.toFixed(1)}%)`)
  console.log(`  Timeout Decisions:             ${timeouts} / ${completedGames} (${timeoutRate.toFixed(1)}%)`)
  console.log(`--------------------------------------------------------------------------------`)
  console.log(`Score Metrics:`)
  console.log(`  Average Player 1 VP Score:     ${avgP1Score.toFixed(1)}`)
  console.log(`  Average Player 2 VP Score:     ${avgP2Score.toFixed(1)}`)
  console.log(`  Average Victory Margin:        ${avgMargin.toFixed(1)}`)
  console.log(`  Lowest / Highest VP Scored:    ${minScore} / ${maxScore}`)
  console.log("================================================================================")

  // Gather specific insights about first-mover bias
  console.log(`\nKey Insights:`)
  if (agent1 === agent2) {
    const firstMoverAdvantage = p1WinRate - p2WinRate
    if (Math.abs(firstMoverAdvantage) < 5) {
      console.log(`* Head-to-Head is highly balanced! First-mover bias is negligible (${firstMoverAdvantage.toFixed(1)}% delta).`)
    } else if (firstMoverAdvantage > 0) {
      console.log(`* Player 1 (First Mover) has a noticeable advantage of +${firstMoverAdvantage.toFixed(1)}% win rate!`)
    } else {
      console.log(`* Player 2 (Second Mover) has a counter-intuitive advantage of +${Math.abs(firstMoverAdvantage).toFixed(1)}% win rate!`)
    }
  } else {
    console.log(`* Playing asymmetrical matchups (${agent1} vs ${agent2}). To evaluate first-mover bias directly, run identical matchups (e.g. optimus vs optimus).`)
  }
  if (timeoutRate > 20) {
    console.log(`* High Timeout Rate detected (${timeoutRate.toFixed(1)}%). Consider increasing --max-turns, or evaluating AI logic for deadlocks or overly conservative defense.`)
  } else {
    console.log(`* Low/healthy Timeout Rate (${timeoutRate.toFixed(1)}%), indicating that games reliably reach natural VP-driven conclusions.`)
  }
  console.log(`================================================================================\n`)
}

run().catch((err) => {
  console.error('Benchmark execution failed:', err)
  process.exit(1)
})