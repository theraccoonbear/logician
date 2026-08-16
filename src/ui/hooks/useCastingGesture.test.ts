import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { TarotCard } from '../../engine/types/tarot'
import type { SpellSelection } from '../components/ActionPanel/SpellBuilder'

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    useState: (initial: any) => {
      let val = typeof initial === 'function' ? initial() : initial
      const setVal = (newVal: any) => {
        val = typeof newVal === 'function' ? newVal(val) : newVal
      }
      return [val, setVal]
    },
    useRef: (initial: any) => ({ current: initial }),
    useEffect: (fn: Function) => {
      fn()
    },
  }
})

import { useCastingGesture } from './useCastingGesture'

const mockTarotRow: TarotCard[] = [
  {
    instanceId: 'tarot-minor-1',
    kind: 'minor',
    suit: 'Cups',
    rank: '3',
    operandA: { kind: 'terrain', value: 'Mountains' },
    operandB: { kind: 'level', value: 3 },
  },
  {
    instanceId: 'tarot-major-1',
    kind: 'major',
    id: 'FOOL',
  },
]

describe('useCastingGesture', () => {
  let listeners: Record<string, Function[]> = {}

  beforeEach(() => {
    listeners = {}
    globalThis.window = {
      addEventListener: vi.fn((event: string, fn: Function) => {
        listeners[event] = listeners[event] || []
        listeners[event].push(fn)
      }),
      removeEventListener: vi.fn((event: string, fn: Function) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter((cb) => cb !== fn)
        }
      }),
    } as any

    globalThis.document = {
      elementFromPoint: vi.fn(),
    } as any
  })

  it('is a defined hook function', () => {
    expect(typeof useCastingGesture).toBe('function')
  })

  it('accepts options and initializes options correctly', () => {
    let spellSelection: SpellSelection = { logicId: null, effectId: null, tarotId: null }
    const onSpellSelectionChange = vi.fn((next) => {
      spellSelection = next
    })

    const options = {
      tarotRow: mockTarotRow,
      spellSelection,
      onSpellSelectionChange,
      enabled: true,
    }

    expect(options.enabled).toBe(true)
    expect(options.tarotRow.length).toBe(2)
  })

  it('attaches pointerdown listener when enabled', () => {
    let spellSelection: SpellSelection = { logicId: null, effectId: null, tarotId: null }
    const onSpellSelectionChange = vi.fn()

    useCastingGesture({
      tarotRow: mockTarotRow,
      spellSelection,
      onSpellSelectionChange,
      enabled: true,
    })

    expect(window.addEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function))
  })

  it('initiates drag and updates spell selection on minor tarot pointerdown', () => {
    let spellSelection: SpellSelection = { logicId: null, effectId: null, tarotId: null }
    const onSpellSelectionChange = vi.fn((next) => {
      spellSelection = next
    })

    useCastingGesture({
      tarotRow: mockTarotRow,
      spellSelection,
      onSpellSelectionChange,
      enabled: true,
    })

    const pointerDownCb = listeners['pointerdown']?.[0]
    expect(pointerDownCb).toBeDefined()

    const mockTarget = {
      closest: vi.fn((selector: string) => {
        if (selector === '[data-tarot-id]') {
          return {
            getAttribute: (attr: string) => {
              if (attr === 'data-tarot-kind') return 'minor'
              if (attr === 'data-tarot-id') return 'tarot-minor-1'
              return null
            },
          }
        }
        return null
      }),
    }

    pointerDownCb!({
      button: 0,
      target: mockTarget,
      clientX: 100,
      clientY: 200,
    })

    expect(onSpellSelectionChange).toHaveBeenCalledWith({
      logicId: null,
      effectId: null,
      tarotId: 'tarot-minor-1',
    })
  })

  it('ignores pointerdown on major tarot cards', () => {
    let spellSelection: SpellSelection = { logicId: null, effectId: null, tarotId: null }
    const onSpellSelectionChange = vi.fn()

    useCastingGesture({
      tarotRow: mockTarotRow,
      spellSelection,
      onSpellSelectionChange,
      enabled: true,
    })

    const pointerDownCb = listeners['pointerdown']?.[0]

    const mockTarget = {
      closest: vi.fn((selector: string) => {
        if (selector === '[data-tarot-id]') {
          return {
            getAttribute: (attr: string) => {
              if (attr === 'data-tarot-kind') return 'major'
              if (attr === 'data-tarot-id') return 'tarot-major-1'
              return null
            },
          }
        }
        return null
      }),
    }

    pointerDownCb!({
      button: 0,
      target: mockTarget,
      clientX: 100,
      clientY: 200,
    })

    expect(onSpellSelectionChange).not.toHaveBeenCalled()
  })

  it('initiates drag on logic card pointerdown', () => {
    let spellSelection: SpellSelection = { logicId: null, effectId: null, tarotId: null }
    const onSpellSelectionChange = vi.fn()

    useCastingGesture({
      tarotRow: mockTarotRow,
      spellSelection,
      onSpellSelectionChange,
      enabled: true,
    })

    const pointerDownCb = listeners['pointerdown']?.[0]

    const mockTarget = {
      closest: vi.fn((selector: string) => {
        if (selector === '[data-logic-id]') {
          return {
            getAttribute: (attr: string) => (attr === 'data-logic-id' ? 'logic-card-1' : null),
          }
        }
        return null
      }),
    }

    pointerDownCb!({
      button: 0,
      target: mockTarget,
      clientX: 150,
      clientY: 250,
    })

    expect(onSpellSelectionChange).toHaveBeenCalledWith({
      logicId: 'logic-card-1',
      effectId: null,
      tarotId: null,
    })
  })

  it('initiates drag on effect card pointerdown', () => {
    let spellSelection: SpellSelection = { logicId: null, effectId: null, tarotId: null }
    const onSpellSelectionChange = vi.fn()

    useCastingGesture({
      tarotRow: mockTarotRow,
      spellSelection,
      onSpellSelectionChange,
      enabled: true,
    })

    const pointerDownCb = listeners['pointerdown']?.[0]

    const mockTarget = {
      closest: vi.fn((selector: string) => {
        if (selector === '[data-effect-id]') {
          return {
            getAttribute: (attr: string) => (attr === 'data-effect-id' ? 'effect-card-1' : null),
          }
        }
        return null
      }),
    }

    pointerDownCb!({
      button: 0,
      target: mockTarget,
      clientX: 200,
      clientY: 300,
    })

    expect(onSpellSelectionChange).toHaveBeenCalledWith({
      logicId: null,
      effectId: 'effect-card-1',
      tarotId: null,
    })
  })
})
