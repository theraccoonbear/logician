import { useContext } from 'react'
import { GameContext } from '../GameProvider'

export function useGameEngine() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGameEngine must be used within a GameProvider')
  return ctx
}
