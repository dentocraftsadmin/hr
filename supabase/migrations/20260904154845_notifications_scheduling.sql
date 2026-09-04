-- CraftsHR — push notification scheduling
-- Vercel's free tier only runs cron jobs once a day, which is too coarse
-- for "15 minutes before shift start" reminders spread across different
-- shifts. pg_cron + pg_net run on Supabase's own free tier instead, at
-- whatever frequency we want, and simply call our Next.js API route —
-- the actual reminder logic and the Web Push send itself still live in the
-- app, not in the database.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Set once, outside this migration (never committed): the deployed app's
-- base URL and the same CRON_SECRET the /api/cron/* routes already check.
-- The sweep is a harmless no-op until app_base_url is set, so this is safe
-- to ship before the app is actually deployed anywhere.
alter table app_settings add column app_base_url text;
alter table app_settings add column cron_secret text;

-- One row per (employee, date, reminder type) actually sent — prevents the
-- sweep from re-sending the same reminder every time it runs that day.
create table notification_log (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  date date not null,
  type text not null check (type in ('punch_in_reminder', 'punch_out_reminder', 'missed_punch_reminder')),
  sent_at timestamptz not null default now(),
  unique (employee_id, date, type)
);
alter table notification_log enable row level security;
create policy "self or admin read notification_log" on notification_log for select
  using (employee_id = auth_employee_id() or is_admin());
-- No insert policy for 'employee'/'admin' roles — only the server-side
-- sweep (service role) writes here, same pattern as attendance_events.

create or replace function trigger_reminder_sweep()
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
    url := v_base_url || '/api/cron/send-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
end;
$$;

select cron.schedule('reminder-sweep', '*/10 * * * *', 'select trigger_reminder_sweep();');
