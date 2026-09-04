-- CraftsHR — default leave types
-- Sensible starting quotas so the leave workflow is usable before a
-- dedicated "leave types" settings screen exists. HR can adjust
-- annual_quota per type directly; nothing about the leave_requests flow is
-- hard-coded to these specific names or numbers.
insert into leave_types (name, annual_quota) values
  ('Casual', 12),
  ('Sick', 12),
  ('Earned', 15);
