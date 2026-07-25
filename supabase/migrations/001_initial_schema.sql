-- Poker Manager: Database Schema
-- Run this in Supabase SQL Editor

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: CREATE ALL TABLES (no policies yet)
-- ============================================

CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  points_system JSONB NOT NULL DEFAULT '{"type":"position","positionPoints":{"1":10,"2":7,"3":5,"4":4,"5":3,"6":2,"7":1},"participationPoints":1}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE league_members (
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (league_id, user_id)
);

CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  scheduled_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  buy_in NUMERIC NOT NULL DEFAULT 0,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE game_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  finish_position INT NOT NULL,
  buy_in_amount NUMERIC NOT NULL DEFAULT 0,
  payout NUMERIC NOT NULL DEFAULT 0,
  points_earned NUMERIC NOT NULL DEFAULT 0,
  rebuys INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_id, player_id)
);

CREATE TABLE game_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  rsvp_status TEXT NOT NULL DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'confirmed', 'declined', 'maybe')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_id, player_id)
);

-- ============================================
-- STEP 2: ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_invites ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: CREATE RLS POLICIES
-- ============================================

-- Leagues
CREATE POLICY "League owners can do everything" ON leagues
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "League members can view" ON leagues
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = leagues.id
      AND league_members.user_id = auth.uid()
    )
  );

-- League Members
CREATE POLICY "Members can view their leagues" ON league_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "League owners can manage members" ON league_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = league_members.league_id
      AND leagues.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can join leagues" ON league_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Seasons
CREATE POLICY "League members can view seasons" ON seasons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = seasons.league_id
      AND league_members.user_id = auth.uid()
    )
  );

CREATE POLICY "League owners/admins can manage seasons" ON seasons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = seasons.league_id
      AND league_members.user_id = auth.uid()
      AND league_members.role IN ('owner', 'admin')
    )
  );

-- Players
CREATE POLICY "League members can view players" ON players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = players.league_id
      AND league_members.user_id = auth.uid()
    )
  );

CREATE POLICY "League owners/admins can manage players" ON players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = players.league_id
      AND league_members.user_id = auth.uid()
      AND league_members.role IN ('owner', 'admin')
    )
  );

-- Games
CREATE POLICY "League members can view games" ON games
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = games.league_id
      AND league_members.user_id = auth.uid()
    )
  );

CREATE POLICY "League owners/admins can manage games" ON games
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = games.league_id
      AND league_members.user_id = auth.uid()
      AND league_members.role IN ('owner', 'admin')
    )
  );

-- Game Results
CREATE POLICY "League members can view results" ON game_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM games
      JOIN league_members ON league_members.league_id = games.league_id
      WHERE games.id = game_results.game_id
      AND league_members.user_id = auth.uid()
    )
  );

CREATE POLICY "League owners/admins can manage results" ON game_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM games
      JOIN league_members ON league_members.league_id = games.league_id
      WHERE games.id = game_results.game_id
      AND league_members.user_id = auth.uid()
      AND league_members.role IN ('owner', 'admin')
    )
  );

-- Game Invites (RSVP)
CREATE POLICY "League members can view invites" ON game_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM games
      JOIN league_members ON league_members.league_id = games.league_id
      WHERE games.id = game_invites.game_id
      AND league_members.user_id = auth.uid()
    )
  );

CREATE POLICY "League owners/admins can manage invites" ON game_invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM games
      JOIN league_members ON league_members.league_id = games.league_id
      WHERE games.id = game_invites.game_id
      AND league_members.user_id = auth.uid()
      AND league_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Players can RSVP to their own invites" ON game_invites
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = game_invites.player_id
      AND players.user_id = auth.uid()
    )
  );

-- ============================================
-- STEP 4: INDEXES
-- ============================================
CREATE INDEX idx_seasons_league_id ON seasons(league_id);
CREATE INDEX idx_players_league_id ON players(league_id);
CREATE INDEX idx_games_league_id ON games(league_id);
CREATE INDEX idx_games_season_id ON games(season_id);
CREATE INDEX idx_game_results_game_id ON game_results(game_id);
CREATE INDEX idx_game_results_player_id ON game_results(player_id);
CREATE INDEX idx_game_invites_game_id ON game_invites(game_id);
CREATE INDEX idx_game_invites_player_id ON game_invites(player_id);
CREATE INDEX idx_league_members_user_id ON league_members(user_id);
