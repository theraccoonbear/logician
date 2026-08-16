import { useEffect, useRef, useState } from 'react'
import type { GameEvent } from '../../engine/types/state'

export function GameLog({ log }: { log: GameEvent[] }) {
  const [copied, setCopied] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  // Track scroll position on the container locally to see if they are at the "hot end"
  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    // Allow a small 12px threshold for fat-fingered/imprecise scrolls near the bottom
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 12
    isAtBottomRef.current = isAtBottom
  }

  // Smoothly scroll the log div to the bottom when new logs arrive — ONLY if they are at the hot end
  useEffect(() => {
    const el = containerRef.current
    if (el && isAtBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
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
      <div className="game-log-list-container" ref={containerRef} onScroll={handleScroll}>
        <ul>
          {log.map((event, i) => (
            <li key={i}>{event.message}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
