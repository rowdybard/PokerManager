begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into auth.users (id, email)
values ('20000000-0000-4000-8000-000000000001', 'guest-host@example.test');

insert into public.leagues (id, name, owner_id)
values (
  '21000000-0000-4000-8000-000000000001',
  'Guest Test League',
  '20000000-0000-4000-8000-000000000001'
);
insert into public.seasons (id, league_id, name, is_active)
values (
  '22000000-0000-4000-8000-000000000001',
  '21000000-0000-4000-8000-000000000001',
  'Guest Test Season',
  true
);
insert into public.games (
  id,
  league_id,
  season_id,
  title,
  kind,
  phase,
  scheduled_date,
  status,
  currency,
  timezone,
  capacity,
  buy_in,
  buy_in_minor,
  entry_fee_minor,
  created_by
)
values (
  '23000000-0000-4000-8000-000000000001',
  '21000000-0000-4000-8000-000000000001',
  '22000000-0000-4000-8000-000000000001',
  'Guest Test Game',
  'cash',
  'registration',
  now() + interval '1 day',
  'scheduled',
  'USD',
  'UTC',
  1,
  100,
  10000,
  0,
  '20000000-0000-4000-8000-000000000001'
);

insert into public.game_invites (
  id,
  game_id,
  token_hash,
  token_expires_at,
  token_revoked_at,
  rsvp_status
)
values
  (
    '24000000-0000-4000-8000-000000000001',
    '23000000-0000-4000-8000-000000000001',
    encode(digest('first-valid-token', 'sha256'), 'hex'),
    now() + interval '1 day',
    null,
    'pending'
  ),
  (
    '24000000-0000-4000-8000-000000000002',
    '23000000-0000-4000-8000-000000000001',
    encode(digest('second-valid-token', 'sha256'), 'hex'),
    now() + interval '1 day',
    null,
    'pending'
  ),
  (
    '24000000-0000-4000-8000-000000000003',
    '23000000-0000-4000-8000-000000000001',
    encode(digest('expired-token', 'sha256'), 'hex'),
    now() - interval '1 minute',
    null,
    'pending'
  ),
  (
    '24000000-0000-4000-8000-000000000004',
    '23000000-0000-4000-8000-000000000001',
    encode(digest('revoked-token', 'sha256'), 'hex'),
    now() + interval '1 day',
    now(),
    'pending'
  );

select set_config(
  'request.jwt.claims',
  '{"role":"service_role","sub":"20000000-0000-4000-8000-000000000001"}',
  true
);
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000001',
  true
);
set local role service_role;

select is(
  public.get_guest_invitation(
    encode(digest('first-valid-token', 'sha256'), 'hex')
  ) #>> '{event,title}',
  'Guest Test Game',
  'valid token exposes only its event payload'
);

select throws_ok(
  $$
    select public.get_guest_invitation(
      encode(digest('guessed-token', 'sha256'), 'hex')
    )
  $$,
  'P0002',
  'Invalid, expired, or revoked invitation',
  'a guessed token is rejected'
);
select throws_ok(
  $$
    select public.get_guest_invitation(
      encode(digest('expired-token', 'sha256'), 'hex')
    )
  $$,
  'P0002',
  'Invalid, expired, or revoked invitation',
  'an expired token is rejected'
);
select throws_ok(
  $$
    select public.get_guest_invitation(
      encode(digest('revoked-token', 'sha256'), 'hex')
    )
  $$,
  'P0002',
  'Invalid, expired, or revoked invitation',
  'a revoked token is rejected'
);

select is(
  public.respond_to_guest_invitation(
    encode(digest('first-valid-token', 'sha256'), 'hex'),
    'yes',
    0,
    '25000000-0000-4000-8000-000000000001'
  ) #>> '{invitation,status}',
  'yes',
  'first valid RSVP is confirmed'
);
select is(
  public.respond_to_guest_invitation(
    encode(digest('first-valid-token', 'sha256'), 'hex'),
    'yes',
    0,
    '25000000-0000-4000-8000-000000000001'
  ) #>> '{invitation,status}',
  'yes',
  'duplicate RSVP idempotency returns the original response'
);
select is(
  public.respond_to_guest_invitation(
    encode(digest('second-valid-token', 'sha256'), 'hex'),
    'yes',
    0,
    '25000000-0000-4000-8000-000000000002'
  ) #>> '{invitation,status}',
  'waitlisted',
  'capacity overflow is waitlisted atomically'
);

select is(
  (
    select waitlist_position
    from public.game_invites
    where id = '24000000-0000-4000-8000-000000000002'
  ),
  1,
  'waitlist position is assigned'
);

select * from finish();
rollback;
