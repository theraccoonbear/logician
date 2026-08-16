import { useEffect, useRef, useState } from 'react'
import type { TarotCard } from '../../engine/types/tarot'
import type { SpellSelection } from '../components/ActionPanel/SpellBuilder'

export interface Point {
  x: number
  y: number
  t: number
}

export interface UseCastingGestureOptions {
  tarotRow: TarotCard[]
  spellSelection: SpellSelection
  onSpellSelectionChange: (next: SpellSelection) => void
  enabled: boolean
}

export interface CastingGestureState {
  isDragging: boolean
  activeTarotId: string | null
  activeTarotCard: TarotCard | null
  pointerPos: { x: number; y: number }
  points: Point[]
}

export function useCastingGesture({
  tarotRow,
  spellSelection,
  onSpellSelectionChange,
  enabled,
}: UseCastingGestureOptions): CastingGestureState {
  const [isDragging, setIsDragging] = useState(false)
  const [activeTarotId, setActiveTarotId] = useState<string | null>(null)
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [points, setPoints] = useState<Point[]>([])

  const spellSelectionRef = useRef(spellSelection)
  useEffect(() => {
    spellSelectionRef.current = spellSelection
  }, [spellSelection])

  const tarotRowRef = useRef(tarotRow)
  useEffect(() => {
    tarotRowRef.current = tarotRow
  }, [tarotRow])

  const onSpellSelectionChangeRef = useRef(onSpellSelectionChange)
  useEffect(() => {
    onSpellSelectionChangeRef.current = onSpellSelectionChange
  }, [onSpellSelectionChange])

  useEffect(() => {
    if (!enabled) {
      if (isDragging) {
        setIsDragging(false)
        setActiveTarotId(null)
        setPoints([])
      }
      return
    }

    const preventDragStart = (e: Event) => e.preventDefault()

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== undefined && e.button !== 0) return

      const target = e.target as HTMLElement | null
      if (!target) return

      const tarotEl = target.closest('[data-tarot-id]')
      const logicEl = target.closest('[data-logic-id]')
      const effectEl = target.closest('[data-effect-id]')

      if (tarotEl) {
        const kind = tarotEl.getAttribute('data-tarot-kind')
        const id = tarotEl.getAttribute('data-tarot-id')
        if (kind === 'minor' && id) {
          if (typeof e.preventDefault === 'function') e.preventDefault()
          window.addEventListener('dragstart', preventDragStart)
          setIsDragging(true)
          setActiveTarotId(id)
          setPointerPos({ x: e.clientX, y: e.clientY })
          setPoints([{ x: e.clientX, y: e.clientY, t: Date.now() }])
          onSpellSelectionChangeRef.current({
            ...spellSelectionRef.current,
            tarotId: id,
          })
        }
      } else if (logicEl) {
        const id = logicEl.getAttribute('data-logic-id')
        if (id) {
          if (typeof e.preventDefault === 'function') e.preventDefault()
          window.addEventListener('dragstart', preventDragStart)
          setIsDragging(true)
          setPointerPos({ x: e.clientX, y: e.clientY })
          setPoints([{ x: e.clientX, y: e.clientY, t: Date.now() }])
          onSpellSelectionChangeRef.current({
            ...spellSelectionRef.current,
            logicId: id,
          })
        }
      } else if (effectEl) {
        const id = effectEl.getAttribute('data-effect-id')
        if (id) {
          if (typeof e.preventDefault === 'function') e.preventDefault()
          window.addEventListener('dragstart', preventDragStart)
          setIsDragging(true)
          setPointerPos({ x: e.clientX, y: e.clientY })
          setPoints([{ x: e.clientX, y: e.clientY, t: Date.now() }])
          onSpellSelectionChangeRef.current({
            ...spellSelectionRef.current,
            effectId: id,
          })
        }
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('dragstart', preventDragStart)
    }
  }, [enabled, isDragging])

  useEffect(() => {
    if (!isDragging) return

    const preventDragStart = (e: Event) => e.preventDefault()
    window.addEventListener('dragstart', preventDragStart)

    const handlePointerMove = (e: PointerEvent) => {
      const x = e.clientX
      const y = e.clientY
      const now = Date.now()

      setPointerPos({ x, y })
      setPoints((prev) => {
        const filtered = prev.filter((p) => now - p.t < 600)
        return [...filtered, { x, y, t: now }]
      })

      const elementUnder = document.elementFromPoint(x, y)
      if (elementUnder) {
        const logicTarget = elementUnder.closest('[data-logic-id]')
        if (logicTarget) {
          const logicId = logicTarget.getAttribute('data-logic-id')
          if (logicId && logicId !== spellSelectionRef.current.logicId) {
            onSpellSelectionChangeRef.current({
              ...spellSelectionRef.current,
              logicId,
            })
          }
        }

        const effectTarget = elementUnder.closest('[data-effect-id]')
        if (effectTarget) {
          const effectId = effectTarget.getAttribute('data-effect-id')
          if (effectId && effectId !== spellSelectionRef.current.effectId) {
            onSpellSelectionChangeRef.current({
              ...spellSelectionRef.current,
              effectId,
            })
          }
        }
      }
    }

    const handlePointerUp = () => {
      window.removeEventListener('dragstart', preventDragStart)
      setIsDragging(false)
      setActiveTarotId(null)
      setTimeout(() => {
        setPoints([])
      }, 150)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('dragstart', preventDragStart)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [isDragging])

  const activeTarotCard = isDragging
    ? tarotRow.find((t) => t.instanceId === (activeTarotId || spellSelection.tarotId)) || null
    : null

  return {
    isDragging,
    activeTarotId,
    activeTarotCard,
    pointerPos,
    points,
  }
}
