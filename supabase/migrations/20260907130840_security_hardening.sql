-- CraftsHR — security hardening from the pre-deployment audit
-- Three fixes, none of which change any application behavior an employee or
-- HR admin actually uses through the UI — they only close gaps that were
-- reachable by calling the Supabase REST API directly.

-- ============================================================
-- 1. audit_logs had a SELECT policy for admins but no INSERT policy at
-- all, so every audit_logs insert from the app (employee create/update,
-- PIN reset, leave approve/reject) was silently rejected by RLS. The
-- feature itself kept working since none of those call sites checked the
-- insert's error — only the audit record silently failed to write.
-- ============================================================
create policy "admin writes audit_logs" on audit_logs for insert with check (is_admin());

-- ============================================================
-- 2. employees UPDATE allowed a self-update with no column restriction,
-- but no self-service profile edit feature exists anywhere in the app.
-- That meant an employee calling the REST API directly with their own
-- session could change their own department/designation/shift/
-- employment_status/joining_date/leaving_date — none of which the UI ever
-- exposes. Restricted to admin-only, matching what the app actually does.
-- If a genuine self-service field (e.g. emergency contact) is added later,
-- this is the policy to reopen — narrowly, not by re-adding a blanket
-- self-update.
-- ============================================================
drop policy "self update own profile fields" on employees;
create policy "admin updates employees" on employees for update
  using (is_admin())
  with check (is_admin());

-- ============================================================
-- 3. leave_requests UPDATE's WITH CHECK only constrained `status` and
-- `employee_id` on the resulting row — it never verified the row was
-- actually pending beforehand, and RLS has no way to compare OLD vs NEW
-- column values on its own, so nothing stopped a direct API call from
-- changing dates/reason/admin_note in the same statement as a "cancel".
-- A trigger is the correct tool for an OLD-vs-NEW comparison; it runs for
-- every update (including the admin's own review action) but only
-- enforces anything when the caller isn't an admin.
-- ============================================================
create or replace function enforce_leave_cancellation_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_admin() then
    return new;
  end if;

  if old.employee_id <> auth_employee_id() then
    raise exception 'Not authorized to modify this leave request.';
  end if;

  if old.status <> 'pending' or new.status <> 'cancelled' then
    raise exception 'A leave request can only be cancelled while it is still pending.';
  end if;

  if new.employee_id <> old.employee_id
     or new.leave_type_id <> old.leave_type_id
     or new.from_date <> old.from_date
     or new.to_date <> old.to_date
     or new.is_half_day <> old.is_half_day
     or coalesce(new.reason, '') <> coalesce(old.reason, '')
     or coalesce(new.admin_note, '') <> coalesce(old.admin_note, '')
  then
    raise exception 'Only the status may change when cancelling a leave request.';
  end if;

  return new;
end;
$$;

create trigger trg_leave_requests_cancel_only
  before update on leave_requests
  for each row execute function enforce_leave_cancellation_only();
