-- Prevent cross-owner references even when a caller guesses another tenant's
-- UUID. RLS protects row visibility; these triggers protect relational
-- integrity inside owner-private records.

begin;

create or replace function private.validate_owner_references()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'career_sessions' then
    if new.home_game_id is not null and not exists (
      select 1
      from public.games as g
      join public.leagues as l on l.id = g.league_id
      left join public.league_members as lm
        on lm.league_id = l.id and lm.user_id = new.owner_id
      where g.id = new.home_game_id
        and (l.owner_id = new.owner_id or lm.user_id is not null)
    ) then
      raise exception 'Home game is not accessible to the career owner'
        using errcode = '23503';
    end if;

  elsif tg_table_name = 'career_expenses' then
    if new.trip_id is not null and not exists (
      select 1 from public.poker_trips
      where id = new.trip_id and owner_id = new.owner_id
    ) then
      raise exception 'Trip is not owned by the expense owner'
        using errcode = '23503';
    end if;
    if new.session_id is not null and not exists (
      select 1 from public.career_sessions
      where id = new.session_id and owner_id = new.owner_id
    ) then
      raise exception 'Session is not owned by the expense owner'
        using errcode = '23503';
    end if;

  elsif tg_table_name = 'staking_allocations' then
    if not exists (
      select 1 from public.staking_deals
      where id = new.deal_id and owner_id = new.owner_id
    ) or not exists (
      select 1 from public.career_sessions
      where id = new.session_id and owner_id = new.owner_id
    ) then
      raise exception 'Staking deal and session must share the allocation owner'
        using errcode = '23503';
    end if;

  elsif tg_table_name = 'professional_calendar_events' then
    if new.session_id is not null and not exists (
      select 1 from public.career_sessions
      where id = new.session_id and owner_id = new.owner_id
    ) then
      raise exception 'Session is not owned by the calendar owner'
        using errcode = '23503';
    end if;
    if new.trip_id is not null and not exists (
      select 1 from public.poker_trips
      where id = new.trip_id and owner_id = new.owner_id
    ) then
      raise exception 'Trip is not owned by the calendar owner'
        using errcode = '23503';
    end if;

  elsif tg_table_name = 'poker_hands' then
    if new.session_id is not null and not exists (
      select 1 from public.career_sessions
      where id = new.session_id and owner_id = new.owner_id
    ) then
      raise exception 'Session is not owned by the hand owner'
        using errcode = '23503';
    end if;

  elsif tg_table_name = 'hand_opponents' then
    if not exists (
      select 1 from public.poker_hands
      where id = new.hand_id and owner_id = new.owner_id
    ) or not exists (
      select 1 from public.poker_opponents
      where id = new.opponent_id and owner_id = new.owner_id
    ) then
      raise exception 'Hand and opponent must share the relationship owner'
        using errcode = '23503';
    end if;

  elsif tg_table_name = 'study_session_hands' then
    if not exists (
      select 1 from public.study_sessions
      where id = new.study_session_id and owner_id = new.owner_id
    ) or not exists (
      select 1 from public.poker_hands
      where id = new.hand_id and owner_id = new.owner_id
    ) then
      raise exception 'Study session and hand must share the relationship owner'
        using errcode = '23503';
    end if;

  elsif tg_table_name = 'bankroll_ledger_entries' then
    if not exists (
      select 1 from public.bankroll_accounts
      where id = new.account_id and owner_id = new.owner_id
    ) then
      raise exception 'Bankroll account is not owned by the ledger owner'
        using errcode = '23503';
    end if;
    if new.session_id is not null and not exists (
      select 1 from public.career_sessions
      where id = new.session_id and owner_id = new.owner_id
    ) then
      raise exception 'Session is not owned by the ledger owner'
        using errcode = '23503';
    end if;
    if new.settlement_id is not null and not exists (
      select 1 from public.settlements
      where id = new.settlement_id and owner_id = new.owner_id
    ) then
      raise exception 'Settlement is not owned by the ledger owner'
        using errcode = '23503';
    end if;

  elsif tg_table_name = 'settlements' then
    if new.session_id is not null and not exists (
      select 1 from public.career_sessions
      where id = new.session_id and owner_id = new.owner_id
    ) then
      raise exception 'Session is not owned by the settlement owner'
        using errcode = '23503';
    end if;
    if new.payer_contact_id is not null and not exists (
      select 1 from public.contacts
      where id = new.payer_contact_id and owner_id = new.owner_id
    ) then
      raise exception 'Payer contact is not owned by the settlement owner'
        using errcode = '23503';
    end if;
    if new.recipient_contact_id is not null and not exists (
      select 1 from public.contacts
      where id = new.recipient_contact_id and owner_id = new.owner_id
    ) then
      raise exception 'Recipient contact is not owned by the settlement owner'
        using errcode = '23503';
    end if;

  elsif tg_table_name = 'career_attachments' then
    if (
      new.entity_type = 'session'
      and not exists (
        select 1 from public.career_sessions
        where id = new.entity_id and owner_id = new.owner_id
      )
    ) or (
      new.entity_type = 'expense'
      and not exists (
        select 1 from public.career_expenses
        where id = new.entity_id and owner_id = new.owner_id
      )
    ) or (
      new.entity_type = 'settlement'
      and not exists (
        select 1 from public.settlements
        where id = new.entity_id and owner_id = new.owner_id
      )
    ) or (
      new.entity_type = 'trip'
      and not exists (
        select 1 from public.poker_trips
        where id = new.entity_id and owner_id = new.owner_id
      )
    ) or (
      new.entity_type = 'hand'
      and not exists (
        select 1 from public.poker_hands
        where id = new.entity_id and owner_id = new.owner_id
      )
    ) or (
      new.entity_type = 'study'
      and not exists (
        select 1 from public.study_sessions
        where id = new.entity_id and owner_id = new.owner_id
      )
    ) or (
      new.entity_type = 'goal'
      and not exists (
        select 1 from public.career_goals
        where id = new.entity_id and owner_id = new.owner_id
      )
    ) then
      raise exception 'Attachment entity is not owned by the attachment owner'
        using errcode = '23503';
    end if;

  elsif tg_table_name = 'email_queue' then
    if new.league_id is not null and not exists (
      select 1 from public.leagues
      where id = new.league_id and owner_id = new.owner_id
    ) then
      raise exception 'League is not owned by the email owner'
        using errcode = '23503';
    end if;
    if new.game_id is not null and not exists (
      select 1
      from public.games as g
      join public.leagues as l on l.id = g.league_id
      where g.id = new.game_id and l.owner_id = new.owner_id
    ) then
      raise exception 'Game is not owned by the email owner'
        using errcode = '23503';
    end if;
    if new.invite_id is not null and not exists (
      select 1
      from public.game_invites as gi
      join public.games as g on g.id = gi.game_id
      join public.leagues as l on l.id = g.league_id
      where gi.id = new.invite_id and l.owner_id = new.owner_id
    ) then
      raise exception 'Invitation is not owned by the email owner'
        using errcode = '23503';
    end if;
    if new.settlement_id is not null and not exists (
      select 1 from public.settlements
      where id = new.settlement_id and owner_id = new.owner_id
    ) then
      raise exception 'Settlement is not owned by the email owner'
        using errcode = '23503';
    end if;

  elsif tg_table_name = 'plaid_reconciliation_candidates' then
    if not exists (
      select 1 from public.plaid_connections
      where id = new.connection_id and owner_id = new.owner_id
    ) then
      raise exception 'Plaid connection is not owned by the candidate owner'
        using errcode = '23503';
    end if;
    if new.matched_ledger_entry_id is not null and not exists (
      select 1 from public.bankroll_ledger_entries
      where id = new.matched_ledger_entry_id and owner_id = new.owner_id
    ) then
      raise exception 'Ledger match is not owned by the candidate owner'
        using errcode = '23503';
    end if;
  end if;

  return new;
end;
$$;
revoke all on function private.validate_owner_references()
  from public, anon, authenticated, service_role;

create trigger validate_career_session_references
before insert or update on public.career_sessions
for each row execute function private.validate_owner_references();
create trigger validate_expense_references
before insert or update on public.career_expenses
for each row execute function private.validate_owner_references();
create trigger validate_staking_allocation_references
before insert or update on public.staking_allocations
for each row execute function private.validate_owner_references();
create trigger validate_calendar_references
before insert or update on public.professional_calendar_events
for each row execute function private.validate_owner_references();
create trigger validate_hand_references
before insert or update on public.poker_hands
for each row execute function private.validate_owner_references();
create trigger validate_hand_opponent_references
before insert or update on public.hand_opponents
for each row execute function private.validate_owner_references();
create trigger validate_study_hand_references
before insert or update on public.study_session_hands
for each row execute function private.validate_owner_references();
create trigger validate_ledger_references
before insert or update on public.bankroll_ledger_entries
for each row execute function private.validate_owner_references();
create trigger validate_settlement_references
before insert or update on public.settlements
for each row execute function private.validate_owner_references();
create trigger validate_attachment_references
before insert or update on public.career_attachments
for each row execute function private.validate_owner_references();
create trigger validate_email_queue_references
before insert or update on public.email_queue
for each row execute function private.validate_owner_references();
create trigger validate_plaid_candidate_references
before insert or update on public.plaid_reconciliation_candidates
for each row execute function private.validate_owner_references();

commit;
