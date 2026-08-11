const PLAYER_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b']

export function getPlayerColor(playerIndex: number): string {
  return PLAYER_COLORS[playerIndex % PLAYER_COLORS.length]
}
