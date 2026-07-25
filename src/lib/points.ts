import type { PointsSystem, GameResult } from '../types'

export function calculatePoints(
  finishPosition: number,
  totalPlayers: number,
  pointsSystem: PointsSystem
): number {
  if (pointsSystem.type === 'position' && pointsSystem.positionPoints) {
    const points = pointsSystem.positionPoints[String(finishPosition)]
    if (points !== undefined) return points
    return pointsSystem.participationPoints ?? 0
  }

  if (pointsSystem.type === 'custom') {
    const base = pointsSystem.basePoints ?? 0
    const multiplier = pointsSystem.buyInMultiplier ?? 0
    const positionBonus = Math.max(0, totalPlayers - finishPosition + 1)
    const participation = pointsSystem.participationPoints ?? 0
    return base + multiplier * positionBonus + participation
  }

  return 0
}

export function calculateAllPoints(
  results: Omit<GameResult, 'id' | 'points_earned' | 'created_at'>[],
  pointsSystem: PointsSystem
): Omit<GameResult, 'id' | 'created_at'>[] {
  const totalPlayers = results.length
  return results.map((r) => ({
    ...r,
    points_earned: calculatePoints(r.finish_position, totalPlayers, pointsSystem),
  }))
}

export const DEFAULT_POINTS_SYSTEM: PointsSystem = {
  type: 'position',
  positionPoints: {
    '1': 10,
    '2': 7,
    '3': 5,
    '4': 4,
    '5': 3,
    '6': 2,
    '7': 1,
  },
  participationPoints: 1,
}
