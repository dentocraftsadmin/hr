-- CraftsHR — initial schema (V1)
-- Normalized from scratch per the approved architecture. No JSON settings blob,
-- no employee-facing "Employee ID", no client-side auth. RLS is the real
-- security boundary; see policies at the bottom of each table block.

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists pgcrypto;

-- ============================================================
-- HELPER: updated_at trigger
-- ============================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- LOOKUP TABLES
-- ============================================================

create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table designations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table shifts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_time time not null,
  end_time time not null,
  -- overnight shifts (end_time < start_time) are valid and handled in app logic,
  -- not blocked here.
  working_days smallint[] not null default '{1,2,3,4,5,6}',
  late_buffer_minutes integer not null default 0 check (late_buffer_minutes >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_shifts_updated_at before update on shifts
  for each row execute function set_updated_at();

create table offices (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text unique,
  address text,
  latitude numeric(9,6) not null,
  longitude numeric(9,6) not null,
  radius_meters integer not null default 200 check (radius_meters > 0),
  default_shift_id uuid references shifts(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_offices_updated_at before update on offices
  for each row execute function set_updated_at();

-- ============================================================
-- PEOPLE
-- ============================================================

create table employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  -- 10-digit local number, no country code, no separators. The corresponding
  -- Supabase Auth user's phone is the E.164 form ('+91' + this value) — see
  -- lib/auth. This column is never shown as an "Employee ID"; id is internal.
  phone text not null unique check (phone ~ '^[6-9][0-9]{9}$'),
  birth_year smallint check (birth_year between 1940 and extract(year from now())::int),
  birth_month smallint check (birth_month between 1 and 12),
  birth_day smallint check (birth_day between 1 and 31),
  department_id uuid references departments(id) on delete set null,
  designation_id uuid references designations(id) on delete set null,
  shift_id uuid references shifts(id) on delete set null,
  employment_status text not null default 'active'
    check (employment_status in ('active','inactive','terminated')),
  joining_date date not null default current_date,
  leaving_date date,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_employees_updated_at before update on employees
  for each row execute function set_updated_at();
create index idx_employees_department on employees(department_id);
create index idx_employees_office_shift on employees(shift_id);
create index idx_employees_status on employees(employment_status);

comment on column employees.birth_month is
  'Nullable: registration only requires birth year. Month/day are optional so the birthday calendar can work when HR has them, without forcing collection (open item J-2 in the architecture doc — collect when known).';

-- An employee's authorized punch location(s) — plural, per spec. One row per
-- (employee, office); exactly one may be marked primary per employee.
create table employee_offices (
  employee_id uuid not null references employees(id) on delete cascade,
  office_id uuid not null references offices(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (employee_id, office_id)
);
create unique index uq_employee_primary_office on employee_offices(employee_id)
  where is_primary;

-- Bridges a Supabase Auth user (phone+PIN login) to a role and an employee
-- record. HR and Admin are one operational role: 'admin'.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  employee_id uuid unique references employees(id) on delete cascade,
  role text not null default 'employee' check (role in ('employee','admin')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- AUTH HELPERS (used throughout RLS policies below)
-- ============================================================

create or replace function auth_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select employee_id from profiles where id = auth.uid();
$$;

create or replace function auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth_role() = 'admin', false);
$$;

-- ============================================================
-- ATTENDANCE
-- ============================================================

-- Append-only. One row per physical punch action. Never updated after
-- insert except by the photo archive job's photo_* fields.
create table attendance_events (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  event_type text not null check (event_type in ('in','out')),
  client_captured_at timestamptz not null,
  server_recorded_at timestamptz not null default now(),
  latitude numeric(9,6) not null,
  longitude numeric(9,6) not null,
  gps_accuracy_meters numeric(6,2),
  office_id uuid references offices(id) on delete set null,
  distance_from_office_meters numeric(8,2),
  location_status text check (location_status in ('at_office','away_from_office')),
  shift_id uuid references shifts(id) on delete set null,
  photo_temp_path text,
  photo_archive_ref text,
  photo_status text not null default 'pending_upload'
    check (photo_status in ('pending_upload','uploaded','archived','failed')),
  device_info jsonb not null default '{}'::jsonb,
  client_request_id uuid not null,
  validation_status text not null default 'valid' check (validation_status in ('valid','flagged')),
  is_late boolean,
  created_at timestamptz not null default now(),
  unique (employee_id, client_request_id)
);
create index idx_attendance_events_employee_time on attendance_events(employee_id, server_recorded_at);
create index idx_attendance_events_photo_status on attendance_events(photo_status);

-- One row per employee per date — the authoritative record reports, points,
-- and the notification engine read from.
create table attendance_days (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  date date not null,
  punch_in_event_id uuid references attendance_events(id) on delete set null,
  punch_out_event_id uuid references attendance_events(id) on delete set null,
  shift_id uuid references shifts(id) on delete set null,
  office_id uuid references offices(id) on delete set null,
  hours_worked numeric(5,2),
  day_type text not null default 'pending'
    check (day_type in ('pending','full_day','half_day','absent','on_leave','holiday','week_off')),
  is_late boolean not null default false,
  location_status text not null default 'unknown'
    check (location_status in ('at_office','away_from_office','unknown')),
  is_flagged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, date)
);
create trigger trg_attendance_days_updated_at before update on attendance_days
  for each row execute function set_updated_at();
create index idx_attendance_days_date on attendance_days(date);
create index idx_attendance_days_flagged on attendance_days(is_flagged) where is_flagged;

-- Every HR edit to a day's record, with a full before/after snapshot.
create table attendance_corrections (
  id uuid primary key default gen_random_uuid(),
  attendance_day_id uuid not null references attendance_days(id) on delete cascade,
  corrected_by uuid not null references profiles(id),
  previous_state jsonb not null,
  new_state jsonb not null,
  reason text not null check (length(trim(reason)) > 0),
  created_at timestamptz not null default now()
);

-- ============================================================
-- LEAVE
-- ============================================================

create table leave_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  annual_quota numeric(4,1) not null default 0 check (annual_quota >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Quota for one employee, one leave type, one year. "Used" is always computed
-- from leave_requests, never stored, so it can't drift.
create table employee_leave_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  leave_type_id uuid not null references leave_types(id) on delete cascade,
  year smallint not null,
  quota numeric(4,1) not null,
  unique (employee_id, leave_type_id, year)
);

create table leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  leave_type_id uuid not null references leave_types(id),
  from_date date not null,
  to_date date not null check (to_date >= from_date),
  is_half_day boolean not null default false,
  reason text,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','cancelled')),
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_leave_requests_updated_at before update on leave_requests
  for each row execute function set_updated_at();
create index idx_leave_requests_employee_status on leave_requests(employee_id, status);
create index idx_leave_requests_dates on leave_requests(from_date, to_date);

create table holidays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  applies_to_office_id uuid references offices(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (name, date, applies_to_office_id)
);
create index idx_holidays_date on holidays(date);

-- ============================================================
-- COMPLIANCE SCORE (points ledger)
-- ============================================================
-- Score is 0-100, primarily automatic, computed from this ledger:
--   score = greatest(0, least(100, 100 + sum(points_ledger.points)))
-- Approved leave and holidays never write a negative entry. Rules are
-- versioned by date range so a later rule change can't rewrite what a past
-- deduction meant.

create table point_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  description text not null,
  points numeric(5,2) not null,
  effective_from date not null default current_date,
  effective_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_point_rules_code_active on point_rules(code) where effective_to is null;

create table points_ledger (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  attendance_day_id uuid references attendance_days(id) on delete set null,
  point_rule_id uuid references point_rules(id),
  points numeric(5,2) not null,
  reason text not null,
  created_by uuid references profiles(id), -- null = applied automatically by the system
  is_override boolean not null default false,
  overridden_ledger_id uuid references points_ledger(id),
  created_at timestamptz not null default now()
);
create index idx_points_ledger_employee on points_ledger(employee_id, created_at);

-- A manual override must state why (mandatory reason) — enforced here so it
-- can never be bypassed by a client that forgets to validate it.
alter table points_ledger add constraint chk_override_reason
  check (not is_override or length(trim(reason)) > 0);

-- ============================================================
-- NOTIFICATIONS (V1 — Web Push)
-- ============================================================

create table notification_preferences (
  employee_id uuid primary key references employees(id) on delete cascade,
  push_enabled boolean not null default false,
  remind_punch_in boolean not null default true,
  remind_punch_in_minutes_before integer not null default 15,
  remind_punch_out boolean not null default true,
  remind_missed_punch boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger trg_notification_prefs_updated_at before update on notification_preferences
  for each row execute function set_updated_at();

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index idx_push_subscriptions_employee on push_subscriptions(employee_id);

-- ============================================================
-- OPERATIONS
-- ============================================================

-- True singleton — one typed row of company-wide scalars, not a JSON blob.
create table app_settings (
  id smallint primary key default 1 check (id = 1),
  company_name text not null default 'CraftsHR',
  company_tagline text,
  timezone text not null default 'Asia/Kolkata',
  updated_at timestamptz not null default now()
);
insert into app_settings (id) values (1);
create trigger trg_app_settings_updated_at before update on app_settings
  for each row execute function set_updated_at();

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  entity_table text not null,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_logs_entity on audit_logs(entity_table, entity_id);
create index idx_audit_logs_actor on audit_logs(actor_id);

create table photo_archive_jobs (
  id uuid primary key default gen_random_uuid(),
  period_month date not null unique,
  status text not null default 'pending'
    check (status in ('pending','running','completed','failed','partially_completed')),
  started_at timestamptz,
  completed_at timestamptz,
  total_photos integer not null default 0,
  archived_count integer not null default 0,
  failed_count integer not null default 0,
  error_log jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table departments enable row level security;
alter table designations enable row level security;
alter table shifts enable row level security;
alter table offices enable row level security;
alter table employees enable row level security;
alter table employee_offices enable row level security;
alter table profiles enable row level security;
alter table attendance_events enable row level security;
alter table attendance_days enable row level security;
alter table attendance_corrections enable row level security;
alter table leave_types enable row level security;
alter table employee_leave_balances enable row level security;
alter table leave_requests enable row level security;
alter table holidays enable row level security;
alter table point_rules enable row level security;
alter table points_ledger enable row level security;
alter table notification_preferences enable row level security;
alter table push_subscriptions enable row level security;
alter table app_settings enable row level security;
alter table audit_logs enable row level security;
alter table photo_archive_jobs enable row level security;

-- ---- Lookup tables: every authenticated user can read; only admin writes.
create policy "read lookups" on departments for select using (auth.uid() is not null);
create policy "admin writes departments" on departments for all using (is_admin()) with check (is_admin());

create policy "read lookups" on designations for select using (auth.uid() is not null);
create policy "admin writes designations" on designations for all using (is_admin()) with check (is_admin());

create policy "read lookups" on shifts for select using (auth.uid() is not null);
create policy "admin writes shifts" on shifts for all using (is_admin()) with check (is_admin());

create policy "read lookups" on offices for select using (auth.uid() is not null);
create policy "admin writes offices" on offices for all using (is_admin()) with check (is_admin());

create policy "read lookups" on leave_types for select using (auth.uid() is not null);
create policy "admin writes leave_types" on leave_types for all using (is_admin()) with check (is_admin());

create policy "read lookups" on holidays for select using (auth.uid() is not null);
create policy "admin writes holidays" on holidays for all using (is_admin()) with check (is_admin());

create policy "read lookups" on point_rules for select using (auth.uid() is not null);
create policy "admin writes point_rules" on point_rules for all using (is_admin()) with check (is_admin());

create policy "admin only" on app_settings for select using (is_admin());
create policy "admin writes app_settings" on app_settings for update using (is_admin()) with check (is_admin());

create policy "admin only" on photo_archive_jobs for all using (is_admin()) with check (is_admin());

-- ---- Employees: self read/update own row (limited columns enforced in app
-- layer/server actions — RLS grants row access, not column-level rules);
-- admin full access.
create policy "self read" on employees for select using (id = auth_employee_id() or is_admin());
create policy "self update own profile fields" on employees for update
  using (id = auth_employee_id() or is_admin())
  with check (id = auth_employee_id() or is_admin());
create policy "admin inserts/deletes employees" on employees for insert with check (is_admin());
create policy "admin deletes employees" on employees for delete using (is_admin());

create policy "self or admin read" on employee_offices for select
  using (employee_id = auth_employee_id() or is_admin());
create policy "admin writes employee_offices" on employee_offices for all
  using (is_admin()) with check (is_admin());

create policy "self read own profile" on profiles for select
  using (id = auth.uid() or is_admin());
create policy "admin writes profiles" on profiles for all using (is_admin()) with check (is_admin());

-- ---- Attendance: employees see only their own; admin sees all. Inserts to
-- attendance_events/points_ledger happen only through SECURITY DEFINER RPCs
-- added in the attendance-engine migration — no direct insert policy is
-- granted to 'employee' here, by design.
create policy "self or admin read attendance_events" on attendance_events for select
  using (employee_id = auth_employee_id() or is_admin());
create policy "admin manages attendance_events" on attendance_events for all
  using (is_admin()) with check (is_admin());

create policy "self or admin read attendance_days" on attendance_days for select
  using (employee_id = auth_employee_id() or is_admin());
create policy "admin manages attendance_days" on attendance_days for update
  using (is_admin()) with check (is_admin());
create policy "admin inserts attendance_days" on attendance_days for insert with check (is_admin());

create policy "self or admin read corrections" on attendance_corrections for select
  using (
    exists (select 1 from attendance_days d where d.id = attendance_day_id and d.employee_id = auth_employee_id())
    or is_admin()
  );
create policy "admin writes corrections" on attendance_corrections for insert with check (is_admin());

-- ---- Leave
create policy "self or admin read balances" on employee_leave_balances for select
  using (employee_id = auth_employee_id() or is_admin());
create policy "admin writes balances" on employee_leave_balances for all
  using (is_admin()) with check (is_admin());

create policy "self or admin read leave_requests" on leave_requests for select
  using (employee_id = auth_employee_id() or is_admin());
create policy "self creates own leave_requests" on leave_requests for insert
  with check (employee_id = auth_employee_id() or is_admin());
create policy "self cancels own pending or admin updates any" on leave_requests for update
  using (employee_id = auth_employee_id() or is_admin())
  with check (
    (employee_id = auth_employee_id() and status = 'cancelled')
    or is_admin()
  );

-- ---- Points: employees read their own ledger (transparency requirement);
-- only admin writes (automatic system entries are written via a
-- SECURITY DEFINER function using the service role, which bypasses RLS).
create policy "self or admin read points_ledger" on points_ledger for select
  using (employee_id = auth_employee_id() or is_admin());
create policy "admin writes points_ledger" on points_ledger for insert with check (is_admin());

-- ---- Notifications: self-managed
create policy "self manages own notification_preferences" on notification_preferences for all
  using (employee_id = auth_employee_id() or is_admin())
  with check (employee_id = auth_employee_id() or is_admin());

create policy "self manages own push_subscriptions" on push_subscriptions for all
  using (employee_id = auth_employee_id() or is_admin())
  with check (employee_id = auth_employee_id() or is_admin());

-- ---- Audit log: admin read-only from the client; writes come from server
-- code using the service role (never from the authenticated client role).
create policy "admin reads audit_logs" on audit_logs for select using (is_admin());
