-- CraftsHR — nightly attendance finalization
-- Catches the case the punch flow can't: a day where an employee never
-- punched at all. Run once per day (by a scheduled job, not on demand) for
-- the day that just ended, in the company's configured timezone.

insert into point_rules (code, description, points, effective_from)
values ('UNAPPROVED_ABSENCE', 'Automatic deduction for an unapproved absence', -5, current_date);

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
  v_leave_exists boolean;
  v_absence_rule point_rules%rowtype;
begin
  v_dow := extract(dow from p_date)::int; -- 0=Sunday..6=Saturday, matches shifts.working_days

  for v_employee in
    select e.id, e.shift_id
    from employees e
    where e.employment_status = 'active'
      and e.joining_date <= p_date
      and (e.leaving_date is null or e.leaving_date >= p_date)
  loop
    -- Already has a record for this day (a punch happened) — just flag an
    -- incomplete one (punched in, never out) for HR to correct. Never
    -- guess at hours or day_type here.
    if exists (select 1 from attendance_days d where d.employee_id = v_employee.id and d.date = p_date) then
      update attendance_days
        set is_flagged = true
        where employee_id = v_employee.id and date = p_date
          and punch_in_event_id is not null and punch_out_event_id is null and not is_flagged;
      continue;
    end if;

    select (v_dow = any(s.working_days)) into v_working from shifts s where s.id = v_employee.shift_id;
    if v_working is null then
      v_working := true; -- no shift assigned yet — treat as a normal day rather than silently skipping
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
             or h.applies_to_office_id in (select office_id from employee_offices where employee_id = v_employee.id))
    ) into v_holiday_exists;

    if v_holiday_exists then
      insert into attendance_days (employee_id, date, day_type, location_status, shift_id)
        values (v_employee.id, p_date, 'holiday', 'unknown', v_employee.shift_id);
      continue;
    end if;

    select exists (
      select 1 from leave_requests lr
      where lr.employee_id = v_employee.id and lr.status = 'approved'
        and p_date between lr.from_date and lr.to_date
    ) into v_leave_exists;

    if v_leave_exists then
      insert into attendance_days (employee_id, date, day_type, location_status, shift_id)
        values (v_employee.id, p_date, 'on_leave', 'unknown', v_employee.shift_id);
      continue;
    end if;

    -- Working day, no holiday, no approved leave, no punch at all.
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
