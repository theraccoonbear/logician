import { useEffect, useState } from 'react'

export interface FloatingDeltaProps {
  delta: number
  newLevel: number | null
  structureType: string
}

function getDeltaText(delta: number, newLevel: number | null, _structureType: string): string {
  if (newLevel === null) return 'destroyed'
  if (delta > 0) return `+${delta}`
  return `${delta}`
}

function getDeltaClass(delta: number, newLevel: number | null): string {
  if (newLevel === null) return 'floating-delta-destroyed'
  if (delta > 0) return 'floating-delta-positive'
  return 'floating-delta-negative'
}

export function FloatingDelta({ delta, newLevel, structureType }: FloatingDeltaProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  if (delta === 0 && newLevel !== null) return null

  const text = getDeltaText(delta, newLevel, structureType)
  const cls = getDeltaClass(delta, newLevel)

  return (
    <div className={`floating-delta ${cls} ${visible ? 'is-visible' : ''}`}>
      {text}
    </div>
  )
}
