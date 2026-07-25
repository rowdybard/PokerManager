-- Poker Manager: Fix RLS recursion, league insert, and owner membership
-- Safe to run against existing database
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Drop ALL existing policies (they have recursion bugs)
-- ============================================

DROP POLICY IF EXISTS "League owners can do everything" ON leagues;
DROP POLICY IF EXISTS "League members can view" ON leagues;
DROP POLICY IF EXISTS "Members can view their leagues" ON league_members;
DROP POLICY IF EXISTS "League owners can manage members" ON league_members;
DROP POLICY IF EXISTS "Users can join leagues" ON league_members;
DROP POLICY IF EXISTS "League members can view seasons" ON seasons;
DROP POLICY IF EXISTS "League owners/admins can manage seasons" ON seasons;
DROP POLICY IF EXISTS "League members can view players" ON players;
DROP POLICY IF EXISTS "League owners/admins can manage players" ON players;
DROP POLICY IF EXISTS "League members can view games" ON games;
DROP POLICY IF EXISTS "League owners/admins can manage games" ON games;
DROP POLICY IF EXISTS "League members can view results" ON game_results;
DROP POLICY IF EXISTS "League owners/admins can manage results" ON game_results;
DROP POLICY IF EXISTS "League members can view invites" ON game_invites;
DROP POLICY IF EXISTS "League owners/admins can manage invites" ON game_invites;
DROP POLICY IF EXISTS "Players can RSVP to their own invites" ON game_invites;

-- ============================================
-- STEP 2: Create SECURITY DEFINER helper functions
-- These bypass RLS to avoid infinite recursion
-- ============================================

CREATE OR REPLACE FUNCTION public.is_league_member(p_league_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM league_members
    WHERE league_id = p_league_id
    AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_league_owner_or_admin(p_league_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM league_members
    WHERE league_id = p_league_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_league_owner(p_league_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM league_members
    WHERE league_id = p_league_id
    AND user_id = auth.uid()
    AND role = 'owner'
  );
$$;

-- ============================================
-- STEP 3: Set owner_id default to auth.uid()
-- ============================================

ALTER TABLE public.leagues
  ALTER COLUMN owner_id SET DEFAULT auth.uid();

-- ============================================
-- STEP 4: Create trigger to auto-insert owner membership row
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_league()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO league_members (league_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (league_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_league_created ON public.leagues;

CREATE TRIGGER on_league_created
  AFTER INSERT ON public.leagues
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_league();

-- ============================================
-- STEP 5: Create non-recursive RLS policies
-- ============================================

-- Leagues: INSERT (only authenticated users, owner_id must match)
CREATE POLICY leagues_insert ON public.leagues
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND owner_id = auth.uid()
  );

-- Leagues: SELECT (owner or any member)
CREATE POLICY leagues_select ON public.leagues
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_league_member(id)
  );

-- Leagues: UPDATE (owner only)
CREATE POLICY leagues_update ON public.leagues
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Leagues: DELETE (owner only)
CREATE POLICY leagues_delete ON public.leagues
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- League Members: SELECT (own membership rows)
CREATE POLICY league_members_select ON public.league_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- League Members: INSERT (owner/admin can add members as 'member' only)
-- Users cannot self-join — must be invited by owner/admin
-- Nobody can insert role='owner' or role='admin' — only the trigger creates owner rows
CREATE POLICY league_members_insert ON public.league_members
  FOR INSERT TO authenticated
  WITH CHECK (
    role = 'member'
    AND public.is_league_owner_or_admin(league_id)
  );

-- League Members: UPDATE (owner/admin can change roles, but not to owner)
CREATE POLICY league_members_update ON public.league_members
  FOR UPDATE TO authenticated
  USING (public.is_league_owner_or_admin(league_id))
  WITH CHECK (
    public.is_league_owner_or_admin(league_id)
    AND role IN ('member', 'admin')
  );

-- League Members: DELETE (owner/admin can remove, users can leave)
CREATE POLICY league_members_delete ON public.league_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_league_owner_or_admin(league_id)
  );

-- Seasons: SELECT (league members)
CREATE POLICY seasons_select ON public.seasons
  FOR SELECT TO authenticated
  USING (public.is_league_member(league_id));

-- Seasons: INSERT/UPDATE/DELETE (owner or admin)
CREATE POLICY seasons_modify ON public.seasons
  FOR ALL TO authenticated
  USING (public.is_league_owner_or_admin(league_id))
  WITH CHECK (public.is_league_owner_or_admin(league_id));

-- Players: SELECT (league members)
CREATE POLICY players_select ON public.players
  FOR SELECT TO authenticated
  USING (public.is_league_member(league_id));

-- Players: INSERT/UPDATE/DELETE (owner or admin)
CREATE POLICY players_modify ON public.players
  FOR ALL TO authenticated
  USING (public.is_league_owner_or_admin(league_id))
  WITH CHECK (public.is_league_owner_or_admin(league_id));

-- Games: SELECT (league members)
CREATE POLICY games_select ON public.games
  FOR SELECT TO authenticated
  USING (public.is_league_member(league_id));

-- Games: INSERT/UPDATE/DELETE (owner or admin)
CREATE POLICY games_modify ON public.games
  FOR ALL TO authenticated
  USING (public.is_league_owner_or_admin(league_id))
  WITH CHECK (public.is_league_owner_or_admin(league_id));

-- Game Results: SELECT (league members)
CREATE POLICY game_results_select ON public.game_results
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_results.game_id
      AND public.is_league_member(games.league_id)
    )
  );

-- Game Results: INSERT/UPDATE/DELETE (owner or admin)
CREATE POLICY game_results_modify ON public.game_results
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_results.game_id
      AND public.is_league_owner_or_admin(games.league_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_results.game_id
      AND public.is_league_owner_or_admin(games.league_id)
    )
  );

-- Game Invites: SELECT (league members)
CREATE POLICY game_invites_select ON public.game_invites
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_invites.game_id
      AND public.is_league_member(games.league_id)
    )
  );

-- Game Invites: INSERT/DELETE (owner or admin)
CREATE POLICY game_invites_modify ON public.game_invites
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_invites.game_id
      AND public.is_league_owner_or_admin(games.league_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_invites.game_id
      AND public.is_league_owner_or_admin(games.league_id)
    )
  );

-- Game Invites: UPDATE RSVP (player who owns the linked player record)
CREATE POLICY game_invites_rsvp ON public.game_invites
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = game_invites.player_id
      AND players.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = game_invites.player_id
      AND players.user_id = auth.uid()
    )
  );

-- ============================================
-- STEP 6: Grant execute on helper functions
-- ============================================

GRANT EXECUTE ON FUNCTION public.is_league_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_league_owner_or_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_league_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_league() TO authenticated;
