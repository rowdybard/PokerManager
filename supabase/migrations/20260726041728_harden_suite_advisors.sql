-- Keep the authenticated API surface invoker-rights only and cover all
-- foreign-key access paths surfaced by the production database advisor.

begin;

alter function public.set_game_check_in(uuid, uuid, boolean, text)
  set schema private;
revoke all on function private.set_game_check_in(uuid, uuid, boolean, text)
  from public, anon, authenticated, service_role;
grant execute on function private.set_game_check_in(uuid, uuid, boolean, text)
  to authenticated;

create function public.set_game_check_in(
  p_game_id uuid,
  p_participant_id uuid,
  p_checked_in boolean,
  p_idempotency_key text
)
returns public.game_participants
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.set_game_check_in(
    p_game_id,
    p_participant_id,
    p_checked_in,
    p_idempotency_key
  );
$$;
revoke all on function public.set_game_check_in(uuid, uuid, boolean, text)
  from public, anon;
grant execute on function public.set_game_check_in(uuid, uuid, boolean, text)
  to authenticated;

-- These integration tables are intentionally server-only. Explicit deny
-- policies document that boundary and keep the RLS advisor unambiguous.
create policy email_webhook_events_no_client_access
on public.email_webhook_events
for all to authenticated
using (false)
with check (false);

create policy plaid_connections_no_client_access
on public.plaid_connections
for all to authenticated
using (false)
with check (false);

create policy plaid_webhook_events_no_client_access
on public.plaid_webhook_events
for all to authenticated
using (false)
with check (false);

create index if not exists game_check_in_requests_game_id_idx
  on private.game_check_in_requests (game_id);
create index if not exists game_check_in_requests_participant_id_idx
  on private.game_check_in_requests (participant_id);
create index if not exists game_check_in_requests_requested_by_idx
  on private.game_check_in_requests (requested_by);
create index if not exists guest_invite_response_requests_invite_id_idx
  on private.guest_invite_response_requests (invite_id);
create index if not exists bankroll_ledger_entries_settlement_id_idx
  on public.bankroll_ledger_entries (settlement_id);
create index if not exists career_expenses_session_id_idx
  on public.career_expenses (session_id);
create index if not exists career_sessions_home_game_id_idx
  on public.career_sessions (home_game_id);
create index if not exists contact_groups_league_id_idx
  on public.contact_groups (league_id);
create index if not exists contacts_merged_into_id_idx
  on public.contacts (merged_into_id);
create index if not exists email_queue_game_id_idx
  on public.email_queue (game_id);
create index if not exists email_queue_invite_id_idx
  on public.email_queue (invite_id);
create index if not exists email_queue_league_id_idx
  on public.email_queue (league_id);
create index if not exists email_queue_settlement_id_idx
  on public.email_queue (settlement_id);
create index if not exists email_webhook_events_queue_id_idx
  on public.email_webhook_events (queue_id);
create index if not exists game_eliminations_eliminated_by_participant_id_idx
  on public.game_eliminations (eliminated_by_participant_id);
create index if not exists game_eliminations_participant_id_idx
  on public.game_eliminations (participant_id);
create index if not exists game_invites_contact_id_idx
  on public.game_invites (contact_id);
create index if not exists game_invites_invited_by_idx
  on public.game_invites (invited_by);
create index if not exists game_participants_contact_id_idx
  on public.game_participants (contact_id);
create index if not exists game_participants_player_id_idx
  on public.game_participants (player_id);
create index if not exists game_reconciliations_finalized_by_idx
  on public.game_reconciliations (finalized_by);
create index if not exists game_seats_participant_id_idx
  on public.game_seats (participant_id);
create index if not exists game_template_invitees_contact_id_idx
  on public.game_template_invitees (contact_id);
create index if not exists game_template_invitees_group_id_idx
  on public.game_template_invitees (group_id);
create index if not exists game_templates_owner_id_idx
  on public.game_templates (owner_id);
create index if not exists game_templates_structure_id_idx
  on public.game_templates (structure_id);
create index if not exists game_transactions_player_id_idx
  on public.game_transactions (player_id);
create index if not exists hand_opponents_opponent_id_idx
  on public.hand_opponents (opponent_id);
create index if not exists hand_opponents_owner_id_idx
  on public.hand_opponents (owner_id);
create index if not exists league_contacts_player_id_idx
  on public.league_contacts (player_id);
create index if not exists league_scoring_rules_created_by_idx
  on public.league_scoring_rules (created_by);
create index if not exists plaid_reconciliation_candidates_connection_id_idx
  on public.plaid_reconciliation_candidates (connection_id);
create index if not exists plaid_reconciliation_candidates_matched_ledger_entry_id_idx
  on public.plaid_reconciliation_candidates (matched_ledger_entry_id);
create index if not exists poker_hands_session_id_idx
  on public.poker_hands (session_id);
create index if not exists professional_calendar_events_session_id_idx
  on public.professional_calendar_events (session_id);
create index if not exists professional_calendar_events_trip_id_idx
  on public.professional_calendar_events (trip_id);
create index if not exists settlements_payer_contact_id_idx
  on public.settlements (payer_contact_id);
create index if not exists settlements_recipient_contact_id_idx
  on public.settlements (recipient_contact_id);
create index if not exists settlements_session_id_idx
  on public.settlements (session_id);
create index if not exists staking_allocations_session_id_idx
  on public.staking_allocations (session_id);
create index if not exists study_session_hands_hand_id_idx
  on public.study_session_hands (hand_id);
create index if not exists study_session_hands_owner_id_idx
  on public.study_session_hands (owner_id);
create index if not exists tournament_structures_league_id_idx
  on public.tournament_structures (league_id);
create index if not exists tournament_structures_owner_id_idx
  on public.tournament_structures (owner_id);

commit;
