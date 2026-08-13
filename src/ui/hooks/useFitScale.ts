import { useEffect, useRef, useState } from 'react'

/** Scales `contentRef` down (never up) so it always fits inside `containerRef`'s width,
 *  instead of overflowing into a scrollbar. Board hex sizes are fixed px values tuned per
 *  orientation (see App.css) — this is what keeps a landscape board from overflowing a
 *  narrower-than-ideal browser window rather than needing horizontal scroll. */
export function useFitScale<C extends HTMLElement, T extends HTMLElement>() {
  const containerRef = useRef<C>(null)
  const contentRef = useRef<T>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || !content) return

    const update = () => {
      const containerWidth = container.clientWidth
      // offsetWidth reflects the un-transformed layout size — CSS transform is a paint-time
      // operation, so this stays accurate even while a previous scale is already applied.
      const contentWidth = content.offsetWidth
      if (!containerWidth || !contentWidth) return
      setScale(Math.min(1, containerWidth / contentWidth))
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(container)
    ro.observe(content)
    return () => ro.disconnect()
  }, [])

  return { containerRef, contentRef, scale }
}
