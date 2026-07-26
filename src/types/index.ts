export type GameStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type RsvpStatus = 'pending' | 'yes' | 'maybe' | 'no' | 'waitlisted'
export type LeagueRole = 'owner' | 'admin' | 'member'
export type GameKind = 'cash' | 'tournament'
export type GamePhase =
  | 'draft'
  | 'inviting'
  | 'registration'
  | 'in_progress'
  | 'closing'
  | 'finalized'
  | 'cancelled'
export type GuestRsvpStatus = RsvpStatus
export type SettlementStatus = 'pending' | 'paid' | 'disputed' | 'void'
export type ISO4217Code = string
export type CareerSessionKind = 'cash' | 'tournament'

export interface Money {
  amountMinor: string
  currency: ISO4217Code
}

export interface League {
  id: string
  name: string
  description: string | null
  owner_id: string
  points_system: PointsSystem
  created_at: string
}

export interface PointsSystem {
  type: 'position' | 'custom'
  // For 'position' type: map finish position to points, e.g. { "1": 10, "2": 7, "3": 5 }
  positionPoints?: Record<string, number>
  // For 'custom' type: formula-based, e.g. base points + buy-in multiplier
  basePoints?: number
  buyInMultiplier?: number
  // Points for players who don't cash
  participationPoints?: number
}

export interface Season {
  id: string
  league_id: string
  name: string
  start_date: string | null
  end_date: string | null
  is_active: boolean
  created_at: string
}

export interface Player {
  id: string
  league_id: string
  user_id: string | null
  display_name: string
  avatar_url: string | null
  created_at: string
}

export interface Game {
  id: string
  season_id: string
  league_id: string
  scheduled_date: string
  status: GameStatus
  buy_in: number
  location: string | null
  notes: string | null
  created_at: string
}

export interface GameResult {
  id: string
  game_id: string
  player_id: string
  finish_position: number
  buy_in_amount: number
  payout: number
  points_earned: number
  rebuys: number
  created_at: string
  total_buy_in_minor?: string | null
  payout_minor?: string | null
  data_quality?: 'trusted' | 'legacy_incomplete'
}

export interface GameInvite {
  id: string
  game_id: string
  player_id: string | null
  contact_id?: string | null
  rsvp_status: RsvpStatus
  responded_at: string | null
  created_at: string
  guest_count?: number
  waitlist_position?: number | null
}

export interface LeagueMember {
  league_id: string
  user_id: string
  role: LeagueRole
  joined_at: string
}

export interface PlayerStats {
  playerId: string
  displayName: string
  avatarUrl: string | null
  gamesPlayed: number
  totalPoints: number
  totalWinnings: number
  totalBuyIns: number
  netProfit: number
  winRate: number
  averageFinish: number
  bestFinish: number
  podiumFinishes: number
  wins: number
}

export interface StandingEntry {
  playerId: string
  displayName: string
  avatarUrl: string | null
  totalPoints: number
  gamesPlayed: number
  totalWinnings: number
  netProfit: number
  wins: number
  rank: number
}
