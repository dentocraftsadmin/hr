-- CraftsHR — configurable leave notice-period scoring
--
-- Business rules (confirmed with the company before implementing):
--   - HR configures a minimum number of "qualifying days" of advance notice
--     for leave, stored in app_settings.leave_notice_days. NULL means the
--     rule is inactive (safe no-op), matching how every other optional
--     setting in this app behaves until configured.
--   - A qualifying day is a day that is either a normal working day for the
--     employee's shift, OR a logged company holiday — a holiday counts
--     even if it falls on what would otherwise be a non-working day.
--   - Counting is inclusive of the day notice was given (day 1) and
--     exclusive of the leave date itself.
--   - Sufficient notice: no score impact.
--   - Insufficient notice (leave was informed, but too late): -2 points,
--     same severity as LATE_ARRIVAL, but its own distinct point_rules row
--     so reports and audit trails identify it correctly as its own
--     violation type, not a late arrival.
--   - No notice at all (an absence with no leave_requests row covering it)
--     is already fully handled by the existing UNAPPROVED_ABSENCE rule —
--     nothing new needed for that case.
--   - Official holidays remain entirely separate from leave: paid, not
--     scored, never affected by this rule.
--
-- This does not touch attendance_days.day_type ('on_leave' still means
-- exactly what it did before) -- insufficient notice adds an additional
-- points_ledger row, it doesn't change how the day itself is classified.
--
-- The exact same qualifying-day calculation also exists in TypeScript
-- (src/lib/data/leave-notice.ts, unit tested) so it can be shown to an
-- employee in real time on the leave request form before they submit --
-- this SQL version is the one actually used to decide and persist a
-- deduction, and is what's authoritative if the two ever disagree.

alter table app_settings add column if not exists leave_notice_days integer;

insert into point_rules (code, description, points, effective_from)
values (
  'LATE_INSUFFICIENT_NOTICE_LEAVE',
  'Automatic deduction for leave informed with less than the required notice',
  -2,
  current_date
)
on conflict do nothing;

create or replace function count_qualifying_notice_days(
  p_employee_id uuid,
  p_informed_date date,
  p_leave_date date
) returns int
language plpgsql
stable
set search_path = public
as $$
declare
  v_working_days int[];
  v_count int := 0;
  v_day date;
begin
  if p_informed_date >= p_leave_date then
    return 0;
  end if;

  select s.working_days into v_working_days
  from employees e
  left join shifts s on s.id = e.shift_id
  where e.id = p_employee_id;

  if v_working_days is null then
    v_working_days := array[1, 2, 3, 4, 5]; -- no shift assigned -- mirror finalize_attendance_day()'s fallback
  end if;

  v_day := p_informed_date;
  while v_day < p_leave_date loop
    if (extract(dow from v_day)::int = any(v_working_days))
      or exists (
        select 1 from holidays h
        where h.date = v_day and h.is_active
          and (h.applies_to_office_id is null
               or h.applies_to_office_id in (
                 select office_id from employee_offices where employee_id = p_employee_id
               ))
      )
    then
      v_count := v_count + 1;
    end if;
    v_day := v_day + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function count_qualifying_notice_days from public;
grant execute on function count_qualifying_notice_days to service_role;

create or replace function finalize_attendance_day(p_date date)
returns table (employee_id uuid, outcome text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee record;
  v_dow int;
  v_working boolean;
  v_holiday_exists boolean;
  v_leave_request record;
  v_absence_rule point_rules%rowtype;
  v_notice_rule point_rules%rowtype;
  v_settings app_settings%rowtype;
  v_informed_date date;
  v_qualifying_days int;
begin
  select * into v_settings from app_settings where id = 1;
  v_dow := extract(dow from p_date)::int; -- 0=Sunday..6=Saturday, matches shifts.working_days

  for v_employee in
    select e.id, e.shift_id
    from employees e
    where e.employment_status = 'active'
      and e.joining_date <= p_date
      and (e.leaving_date is null or e.leaving_date >= p_date)
  loop
    if exists (select 1 from attendance_days d where d.employee_id = v_employee.id and d.date = p_date) then
      update attendance_days
        set is_flagged = true
        where attendance_days.employee_id = v_employee.id and attendance_days.date = p_date
          and punch_in_event_id is not null and punch_out_event_id is null and not is_flagged;
      continue;
    end if;

    select (v_dow = any(s.working_days)) into v_working from shifts s where s.id = v_employee.shift_id;
    if v_working is null then
      v_working := true;
    end if;

    if not v_working then
      insert into attendance_days (employee_id, date, day_type, location_status, shift_id)
        values (v_employee.id, p_date, 'week_off', 'unknown', v_employee.shift_id);
      continue;
    end if;

    select exists (
      select 1 from holidays h
      where h.date = p_date and h.is_active
        and (h.applies_to_office_id is null
             or h.applies_to_office_id in (select eo.office_id from employee_offices eo where eo.employee_id = v_employee.id))
    ) into v_holiday_exists;

    if v_holiday_exists then
      insert into attendance_days (employee_id, date, day_type, location_status, shift_id)
        values (v_employee.id, p_date, 'holiday', 'unknown', v_employee.shift_id);
      continue;
    end if;

    select * into v_leave_request from leave_requests lr
      where lr.employee_id = v_employee.id and lr.status = 'approved'
        and p_date between lr.from_date and lr.to_date
      limit 1;

    if found then
      insert into attendance_days (employee_id, date, day_type, location_status, shift_id)
        values (v_employee.id, p_date, 'on_leave', 'unknown', v_employee.shift_id);

      -- Evaluate notice once per leave request, on its first day, so a
      -- multi-day leave gets at most one deduction rather than one per day.
      if v_leave_request.from_date = p_date and v_settings.leave_notice_days is not null then
        v_informed_date := (v_leave_request.created_at at time zone v_settings.timezone)::date;
        v_qualifying_days := count_qualifying_notice_days(v_employee.id, v_informed_date, v_leave_request.from_date);

        if v_qualifying_days < v_settings.leave_notice_days then
          select * into v_notice_rule from point_rules
            where code = 'LATE_INSUFFICIENT_NOTICE_LEAVE' and effective_from <= p_date
              and (effective_to is null or effective_to > p_date) and is_active
            order by effective_from desc limit 1;
          if found then
            insert into points_ledger (employee_id, attendance_day_id, point_rule_id, points, reason)
              select v_employee.id, d.id, v_notice_rule.id, v_notice_rule.points,
                format(
                  'Automatic: leave informed %s qualifying %s before the leave date; minimum required notice is %s days.',
                  v_qualifying_days,
                  case when v_qualifying_days = 1 then 'day' else 'days' end,
                  v_settings.leave_notice_days
                )
              from attendance_days d where d.employee_id = v_employee.id and d.date = p_date;
          end if;
        end if;
      end if;

      continue;
    end if;

    insert into attendance_days (employee_id, date, day_type, location_status, is_flagged, shift_id)
      values (v_employee.id, p_date, 'absent', 'unknown', true, v_employee.shift_id);

    select * into v_absence_rule from point_rules
      where code = 'UNAPPROVED_ABSENCE' and effective_from <= p_date
        and (effective_to is null or effective_to > p_date) and is_active
      order by effective_from desc limit 1;
    if found then
      insert into points_ledger (employee_id, attendance_day_id, point_rule_id, points, reason)
        select v_employee.id, d.id, v_absence_rule.id, v_absence_rule.points, 'Automatic: unapproved absence'
        from attendance_days d where d.employee_id = v_employee.id and d.date = p_date;
    end if;

    return query select v_employee.id, 'absent'::text;
  end loop;
end;
$$;

revoke all on function finalize_attendance_day from public;
grant execute on function finalize_attendance_day to service_role;
