begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select no_plan();

select ok(to_regtype('public.game_kind') is not null, 'game kind enum exists');
select ok(to_regtype('public.game_phase') is not null, 'game phase enum exists');
select ok(to_regtype('public.rsvp_status') is not null, 'RSVP enum exists');
select ok(to_regtype('public.settlement_status') is not null, 'settlement enum exists');
select ok(to_regtype('public.career_session_kind') is not null, 'career session enum exists');

select ok(to_regclass('public.contacts') is not null, 'contacts table exists');
select ok(to_regclass('public.game_templates') is not null, 'game templates table exists');
select ok(to_regclass('public.game_participants') is not null, 'participants table exists');
select ok(to_regclass('public.game_transactions') is not null, 'game transactions table exists');
select ok(to_regclass('public.career_sessions') is not null, 'career sessions table exists');
select ok(to_regclass('public.bankroll_ledger_entries') is not null, 'bankroll ledger exists');
select ok(to_regclass('public.settlements') is not null, 'settlements table exists');
select ok(to_regclass('public.email_queue') is not null, 'email queue exists');
select ok(
  to_regclass('public.plaid_reconciliation_candidates') is not null,
  'Plaid reconciliation candidates table exists'
);

select is(
  (
    select count(*)::integer
    from pg_class as c
    join pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  ),
  0,
  'RLS is enabled on every public table'
);

select is(
  (
    select count(*)::integer
    from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'
  ),
  0,
  'anonymous callers have no direct public table grants'
);

select is(
  (
    select count(*)::integer
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  ),
  0,
  'anonymous callers cannot execute public security-definer functions'
);

select is(
  (
    select count(*)::integer
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  0,
  'authenticated API functions do not expose definer rights'
);

select ok(
  to_regprocedure('public.create_league(text,text,jsonb,text)') is not null,
  'atomic create league RPC exists'
);
select ok(
  to_regprocedure('public.create_game_from_template(uuid,timestamptz,text,text)') is not null,
  'atomic create game RPC exists'
);
select ok(
  to_regprocedure(
    'public.record_game_transaction(uuid,uuid,uuid,public.game_transaction_type,bigint,text,text,text)'
  ) is not null,
  'atomic game transaction RPC exists'
);
select ok(
  to_regprocedure('public.finalize_game(uuid,text)') is not null,
  'atomic finalization RPC exists'
);
select ok(
  to_regprocedure('public.set_game_check_in(uuid,uuid,boolean,text)') is not null,
  'idempotent check-in RPC exists'
);
select ok(
  to_regprocedure(
    'public.post_ledger_entry(uuid,uuid,uuid,public.ledger_entry_type,bigint,text,timestamptz,text,text,text)'
  ) is not null,
  'append-only ledger RPC exists'
);
select ok(
  to_regprocedure('public.reverse_ledger_entry(uuid,uuid,text,text)') is not null,
  'ledger reversal RPC exists'
);
select ok(
  to_regprocedure(
    'public.create_settlement(uuid,uuid,text,text,bigint,text,text,text,text,text,date,text)'
  ) is not null,
  'settlement RPC exists'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.get_guest_invitation(text)'::regprocedure,
    'EXECUTE'
  ),
  'guest lookup RPC is service-role only'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.respond_to_guest_invitation(text,public.rsvp_status,integer,uuid)'::regprocedure,
    'EXECUTE'
  ),
  'guest response RPC is not directly exposed'
);

select is(
  (
    select count(*)::integer
    from pg_indexes
    where schemaname = 'public'
      and indexname in (
        'idx_seasons_one_active_per_league',
        'seasons_one_active_per_league_idx'
      )
  ),
  1,
  'exactly one active-season uniqueness index remains'
);

select ok(
  exists (
    select 1
    from storage.buckets
    where id = 'career-documents' and not public
  ),
  'career documents bucket is private'
);

select is(
  (
    select count(*)::integer
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename in (
        'games',
        'game_invites',
        'game_participants',
        'game_transactions',
        'game_seats',
        'tournament_levels',
        'tournament_clocks',
        'game_results',
        'game_reconciliations',
        'seasons'
      )
  ),
  10,
  'all active-event tables are published to Realtime'
);

select * from finish();
rollback;
