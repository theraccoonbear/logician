import { useEffect, useRef, useState } from 'react'
import type { GameEvent } from '../../engine/types/state'

export function GameLog({ log }: { log: GameEvent[] }) {
  const [copied, setCopied] = useState(false)
  const listEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to the bottom of the log when new events arrive
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log.length])

  const copyToClipboard = () => {
    const text = log.map((event) => event.message).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="game-log">
      <div className="game-log-header">
        <div className="card-hand-label" style={{ margin: 0 }}>Game Log (LGN Replay)</div>
        <button className="copy-log-button" onClick={copyToClipboard} title="Copy entire LGN replay log to clipboard">
          {copied ? '✅ Copied!' : '📋 Copy Log'}
        </button>
      </div>
      <div className="game-log-list-container">
        <ul>
          {log.map((event, i) => (
            <li key={i}>{event.message}</li>
          ))}
        </ul>
        <div ref={listEndRef} />
      </div>
    </div>
  )
}
