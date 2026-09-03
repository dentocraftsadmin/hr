-- CraftsHR — attendance engine
-- The submit_punch() function is the ONLY writer of attendance_events,
-- attendance_days, and automatic points_ledger entries. It runs as
-- SECURITY DEFINER specifically so a client can never insert a punch row
-- directly and lie about distance/lateness — RLS on those tables grants the
-- 'employee' role no INSERT at all (see initial migration).

-- ============================================================
-- app_settings: day-type thresholds
-- ------------------------------------------------------------
-- Added here rather than in the initial migration because the need for them
-- only became concrete while building the punch function itself.
-- ============================================================
alter table app_settings add column full_day_hours numeric(4,2) not null default 6.5 check (full_day_hours > 0);
alter table app_settings add column half_day_min_hours numeric(4,2) not null default 4.5 check (half_day_min_hours > 0);

-- ============================================================
-- Seed a default late-arrival rule so scoring works before the dedicated
-- rules-management UI (a later milestone) exists. HR can add/replace rules
-- once that UI lands — this migration only guarantees one exists.
-- ============================================================
insert into point_rules (code, description, points, effective_from)
values ('LATE_ARRIVAL', 'Automatic deduction for a late punch-in', -2, current_date);

-- ============================================================
-- Storage: temporary punch photos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('punch-photos-temp', 'punch-photos-temp', false)
on conflict (id) do nothing;

-- Path convention: temp/<employee_id>/<client_request_id>.jpg — an employee
-- may only touch their own folder; admin may read everyone's (for
-- corrections/support). No one may update or delete — photos are only ever
-- removed by the (service-role) monthly archive job.
create policy "employee uploads own temp photo"
  on storage.objects for insert
  with check (
    bucket_id = 'punch-photos-temp'
    and (storage.foldername(name))[1] = 'temp'
    and (storage.foldername(name))[2] = auth_employee_id()::text
  );

create policy "employee or admin reads temp photos"
  on storage.objects for select
  using (
    bucket_id = 'punch-photos-temp'
    and (
      (storage.foldername(name))[2] = auth_employee_id()::text
      or is_admin()
    )
  );

-- ============================================================
-- submit_punch
-- ============================================================
create or replace function submit_punch(
  p_event_type text,
  p_client_captured_at timestamptz,
  p_latitude numeric,
  p_longitude numeric,
  p_gps_accuracy_meters numeric,
  p_device_info jsonb,
  p_client_request_id uuid,
  p_photo_temp_path text
)
returns table (
  event_id uuid,
  location_status text,
  distance_from_office_meters numeric,
  office_name text,
  is_late boolean,
  day_type text,
  hours_worked numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_id uuid;
  v_existing_event attendance_events%rowtype;
  v_office record;
  v_best_office_id uuid;
  v_best_office_name text;
  v_best_distance numeric;
  v_location_status text;
  v_shift shifts%rowtype;
  v_is_late boolean := false;
  v_expected_start timestamptz;
  v_today date;
  v_day attendance_days%rowtype;
  v_hours numeric;
  v_day_type text;
  v_settings app_settings%rowtype;
  v_new_event_id uuid;
  v_active_rule point_rules%rowtype;
  v_validation text := 'valid';
begin
  v_employee_id := auth_employee_id();
  if v_employee_id is null then
    raise exception 'Not signed in as an employee.';
  end if;
  if p_event_type not in ('in', 'out') then
    raise exception 'Invalid punch type.';
  end if;

  select * into v_settings from app_settings where id = 1;

  -- The calendar day a punch belongs to, and lateness, are always derived
  -- from server time in the company's configured timezone — never from the
  -- client-supplied timestamp, which is diagnostic only (see is_late below).
  v_today := (now() at time zone v_settings.timezone)::date;

  -- Idempotent retry: the same attempt resubmitted returns the original
  -- result instead of erroring or inserting a second row. Computed after
  -- v_today so the day_type/hours_worked lookup below actually matches.
  select * into v_existing_event from attendance_events
    where employee_id = v_employee_id and client_request_id = p_client_request_id;
  if found then
    return query
      select v_existing_event.id, v_existing_event.location_status,
             v_existing_event.distance_from_office_meters,
             (select name from offices where id = v_existing_event.office_id),
             v_existing_event.is_late,
             d.day_type, d.hours_worked
      from attendance_days d
      where d.employee_id = v_employee_id and d.date = v_today;
    return;
  end if;

  -- Large drift between the phone's clock and the server's is the
  -- "reasonably detectable" clock-manipulation signal — flagged for HR
  -- review, not blocked (a genuinely wrong phone clock shouldn't stop
  -- someone from punching in).
  if abs(extract(epoch from (now() - p_client_captured_at))) > 300 then
    v_validation := 'flagged';
  end if;

  -- Applicable office = nearest of this employee's authorized offices.
  v_best_distance := null;
  for v_office in
    select o.* from offices o
    join employee_offices eo on eo.office_id = o.id
    where eo.employee_id = v_employee_id and o.is_active
  loop
    declare
      v_dist numeric;
    begin
      v_dist := 6371000 * acos(least(1, greatest(-1,
        cos(radians(p_latitude)) * cos(radians(v_office.latitude)) *
          cos(radians(v_office.longitude) - radians(p_longitude)) +
        sin(radians(p_latitude)) * sin(radians(v_office.latitude))
      )));
      if v_best_distance is null or v_dist < v_best_distance then
        v_best_distance := v_dist;
        v_best_office_id := v_office.id;
        v_best_office_name := v_office.name;
        v_location_status := case when v_dist <= v_office.radius_meters then 'at_office' else 'away_from_office' end;
      end if;
    end;
  end loop;

  if v_best_office_id is null then
    raise exception 'You are not assigned to any office. Contact HR.';
  end if;

  select * into v_shift from shifts where id = (select shift_id from employees where id = v_employee_id);

  select * into v_day from attendance_days where employee_id = v_employee_id and date = v_today;

  if p_event_type = 'in' then
    if found and v_day.punch_in_event_id is not null and v_day.punch_out_event_id is null then
      raise exception 'Already punched in today — punch out first.';
    end if;

    if v_shift.start_time is not null then
      -- (date + time) is a naive timestamp; "at time zone" here interprets
      -- that naive value AS being in the company's zone, producing the
      -- correct absolute instant to compare against now() regardless of
      -- the database session's own timezone.
      v_expected_start := ((v_today + v_shift.start_time) at time zone v_settings.timezone)
        + make_interval(mins => v_shift.late_buffer_minutes);
      v_is_late := now() > v_expected_start;
    end if;

    insert into attendance_events (
      employee_id, event_type, client_captured_at, latitude, longitude,
      gps_accuracy_meters, office_id, distance_from_office_meters, location_status,
      shift_id, photo_temp_path, photo_status, device_info, client_request_id, is_late,
      validation_status
    ) values (
      v_employee_id, 'in', p_client_captured_at, p_latitude, p_longitude,
      p_gps_accuracy_meters, v_best_office_id, v_best_distance, v_location_status,
      v_shift.id, p_photo_temp_path, case when p_photo_temp_path is not null then 'uploaded' else 'pending_upload' end,
      coalesce(p_device_info, '{}'::jsonb), p_client_request_id, v_is_late, v_validation
    ) returning id into v_new_event_id;

    insert into attendance_days (employee_id, date, punch_in_event_id, shift_id, office_id, is_late, location_status, day_type)
      values (v_employee_id, v_today, v_new_event_id, v_shift.id, v_best_office_id, v_is_late, v_location_status, 'pending')
      on conflict (employee_id, date) do update set
        punch_in_event_id = excluded.punch_in_event_id,
        shift_id = excluded.shift_id,
        office_id = excluded.office_id,
        is_late = excluded.is_late,
        location_status = excluded.location_status;

    if v_is_late then
      select * into v_active_rule from point_rules
        where code = 'LATE_ARRIVAL' and effective_from <= v_today
          and (effective_to is null or effective_to > v_today) and is_active
        order by effective_from desc limit 1;
      if found then
        insert into points_ledger (employee_id, attendance_day_id, point_rule_id, points, reason)
          select v_employee_id, ad.id, v_active_rule.id, v_active_rule.points, 'Automatic: late arrival'
          from attendance_days ad where ad.employee_id = v_employee_id and ad.date = v_today;
      end if;
    end if;

    return query select v_new_event_id, v_location_status, v_best_distance, v_best_office_name, v_is_late, 'pending'::text, null::numeric;

  else -- 'out'
    if not found or v_day.punch_in_event_id is null or v_day.punch_out_event_id is not null then
      raise exception 'No open punch-in found for today.';
    end if;

    insert into attendance_events (
      employee_id, event_type, client_captured_at, latitude, longitude,
      gps_accuracy_meters, office_id, distance_from_office_meters, location_status,
      shift_id, photo_temp_path, photo_status, device_info, client_request_id, is_late,
      validation_status
    ) values (
      v_employee_id, 'out', p_client_captured_at, p_latitude, p_longitude,
      p_gps_accuracy_meters, v_best_office_id, v_best_distance, v_location_status,
      v_shift.id, p_photo_temp_path, case when p_photo_temp_path is not null then 'uploaded' else 'pending_upload' end,
      coalesce(p_device_info, '{}'::jsonb), p_client_request_id, null, v_validation
    ) returning id into v_new_event_id;

    select extract(epoch from (now() - pi.server_recorded_at)) / 3600.0 into v_hours
      from attendance_events pi where pi.id = v_day.punch_in_event_id;

    v_day_type := case
      when v_hours >= v_settings.full_day_hours then 'full_day'
      when v_hours >= v_settings.half_day_min_hours then 'half_day'
      else 'half_day'
    end;

    update attendance_days set
      punch_out_event_id = v_new_event_id,
      hours_worked = round(v_hours, 2),
      day_type = v_day_type,
      is_flagged = (v_hours < v_settings.half_day_min_hours)
    where id = v_day.id;

    return query select v_new_event_id, v_location_status, v_best_distance, v_best_office_name, v_day.is_late, v_day_type, round(v_hours, 2);
  end if;
end;
$$;

revoke all on function submit_punch from public;
grant execute on function submit_punch to authenticated;
