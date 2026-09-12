-- CraftsHR — HR notification composer, mandatory registration push,
-- birthday calendar data, and WebAuthn quick-unlock credentials.

-- ============================================================
-- 1. Push subscriptions may now belong directly to a profile (not only an
--    employee). An admin-only account (no linked employees row) still needs
--    somewhere to store its own subscription so it can test-send to itself.
--    Existing employee-linked rows are untouched; exactly one of the two
--    owner columns must be set.
-- ============================================================
alter table push_subscriptions alter column employee_id drop not null;
alter table push_subscriptions add column profile_id uuid references profiles(id) on delete cascade;
alter table push_subscriptions add constraint push_subscriptions_owner_check
  check ((employee_id is not null) <> (profile_id is not null));

drop policy "self manages own push_subscriptions" on push_subscriptions;
create policy "self manages own push_subscriptions" on push_subscriptions for all
  using (employee_id = auth_employee_id() or profile_id = auth.uid() or is_admin())
  with check (employee_id = auth_employee_id() or profile_id = auth.uid() or is_admin());

-- ============================================================
-- 1b. Symmetric preference for the new missed-punch-out reminder below —
--     mirrors remind_missed_punch, which already does this for punch-in.
-- ============================================================
alter table notification_preferences add column remind_missed_punch_out boolean not null default true;

-- ============================================================
-- 2. New reminder type: missed punch-out. The existing punch_out_reminder
--    fires once at shift end; this escalates the same way
--    missed_punch_reminder already escalates the punch-in reminder.
--    (Dropped dynamically since the original inline `check` was unnamed —
--    don't assume Postgres's auto-generated constraint name.)
-- ============================================================
do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_attribute att on att.attrelid = rel.oid and att.attnum = any(con.conkey)
    where rel.relname = 'notification_log' and con.contype = 'c' and att.attname = 'type'
  loop
    execute format('alter table notification_log drop constraint %I', r.conname);
  end loop;
end $$;

alter table notification_log add constraint notification_log_type_check
  check (type in ('punch_in_reminder', 'punch_out_reminder', 'missed_punch_reminder', 'missed_punch_out_reminder'));

-- ============================================================
-- 3. HR notification composer: one row per composed message, one row per
--    recipient outcome. "sent" means the push service accepted the
--    request — never claim delivery, the protocol can't confirm that.
-- ============================================================
create table notification_broadcasts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references profiles(id),
  message text not null check (char_length(message) between 1 and 500),
  audience_type text not null check (audience_type in ('everyone','department','office','department_office','individual')),
  department_id uuid references departments(id) on delete set null,
  office_id uuid references offices(id) on delete set null,
  employee_id uuid references employees(id) on delete set null,
  recipient_count integer not null default 0,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled','sending','sent','failed','cancelled')),
  created_at timestamptz not null default now()
);
create index idx_notification_broadcasts_pending on notification_broadcasts(status, scheduled_at) where status = 'scheduled';

create table notification_broadcast_recipients (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references notification_broadcasts(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  status text not null check (status in ('sent','failed','skipped_no_subscription')),
  error text,
  sent_at timestamptz not null default now(),
  unique (broadcast_id, employee_id)
);

alter table notification_broadcasts enable row level security;
alter table notification_broadcast_recipients enable row level security;
create policy "admin manages notification_broadcasts" on notification_broadcasts for all
  using (is_admin()) with check (is_admin());
create policy "admin reads notification_broadcast_recipients" on notification_broadcast_recipients for select
  using (is_admin());
-- No client-side insert policy on recipients: only the server (service
-- role), same pattern as attendance_events / points_ledger.

-- ============================================================
-- 4. WebAuthn quick-unlock credentials. Public key material only — never a
--    biometric template, never the device PIN/pattern (the platform
--    authenticator never exposes those to a website in the first place).
-- ============================================================
create table webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  device_type text,
  backed_up boolean not null default false,
  transports text[],
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
alter table webauthn_credentials enable row level security;
create policy "self manages own webauthn_credentials" on webauthn_credentials for all
  using (employee_id = auth_employee_id() or is_admin())
  with check (employee_id = auth_employee_id() or is_admin());

-- ============================================================
-- 5. Broadcast sweep — same pattern as the existing reminder-sweep
--    (pg_cron -> pg_net -> our own API route), reusing
--    app_settings.app_base_url/cron_secret rather than adding new columns.
-- ============================================================
create or replace function trigger_broadcast_sweep()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base_url text;
  v_secret text;
begin
  select app_base_url, cron_secret into v_base_url, v_secret from app_settings where id = 1;
  if v_base_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := v_base_url || '/api/cron/send-broadcasts',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
end;
$$;

select cron.schedule('broadcast-sweep', '*/5 * * * *', 'select trigger_broadcast_sweep();');
