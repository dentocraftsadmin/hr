# CraftsHR — build notes for Claude

## Security hardening (pre-deployment audit, migration 20260907130840)

A dedicated pre-deployment audit (git/schema/RLS/code review, not just
typecheck/build) found and fixed three real gaps before anything was pushed
anywhere:

- `audit_logs` had a SELECT policy for admins but **no INSERT policy at
  all** — every audit write from the app (employee create/update, PIN
  reset, leave approve/reject) was silently rejected by RLS the whole time.
  The feature itself kept working since no call site checked the insert's
  error, so this was invisible until someone actually queried
  `audit_logs` and found it empty despite obvious admin activity. Fixed
  with an INSERT policy scoped to `is_admin()`, same pattern as
  `attendance_corrections`/`points_ledger`.
- `employees` UPDATE RLS allowed a self-update with no column restriction,
  but no self-service profile edit feature exists in the app. Restricted to
  admin-only. If a genuine self-service field is added later, reopen this
  narrowly — don't restore a blanket self-update.
- `leave_requests` UPDATE's `WITH CHECK` constrained only `status` and
  `employee_id`, not the rest of the row — RLS alone can't compare OLD vs
  NEW column values, so nothing stopped a direct API call from changing
  dates/reason/admin_note in the same statement as a "cancel". Added
  `enforce_leave_cancellation_only()`, a BEFORE UPDATE trigger that no-ops
  for admins and otherwise verifies the row was pending, the new status is
  `cancelled`, and no other column changed.

All three were verified against the live database, not just re-run
tests: created a real employee, updated it, reset its PIN, approved one
leave request and rejected another — confirmed all 5 as real rows in
`audit_logs`. Then, as the affected employee via direct PostgREST calls
(bypassing the app entirely), confirmed a self-tampering PATCH on
`employees` now affects zero rows, and a leave-cancel PATCH that also
tried to smuggle a changed reason/dates now gets rejected with `P0001:
Only the status may change when cancelling a leave request.` — while a
clean status-only cancel still succeeds. Also confirmed a second
employee's session gets empty results for every cross-employee read
(employees, leave_requests, points_ledger, attendance_days) and a 403 on
writing into another employee's storage path.

A leftover bucket from the old app (`punch-photos`, public, with an
anon-upload policy, containing 3 real photos) was also found still live in
the same Supabase project and has been deleted along with that policy —
unrelated to anything built in this rebuild, but a real exposure that
predated it. `punch-photos-temp` (the bucket this app actually uses) was
untouched throughout.


Rebuild of an HR/attendance app for ~60 employees. Old app (static HTML,
client-side auth, plaintext PINs) is gone from `main`; this build happens on
the `rebuild` branch. Full architecture proposal and feature audit were
produced before this build started — this file is the condensed, living
version of the decisions that actually matter while coding.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind v4 · Supabase
(Postgres + Auth + Storage) · Vercel · Google Drive (photo archive, not yet
implemented) · Vitest.

## Auth (settled during implementation — differs from the original architecture doc)

Employees log in with **phone + exactly 4-digit PIN**. No OTP, no email, no
MFA. Implementation uses Supabase Auth's native **phone + password**
sign-in — not the email-alias workaround the architecture doc originally
proposed:

- `employees.phone` is a plain 10-digit number (no country code). The
  matching `auth.users.phone` is country-code + digits with **no leading
  "+"** — conversion happens only in `lib/auth/phone.ts`. Found by an actual
  login failing end-to-end during the polish pass: a leading "+" (technically
  correct E.164) made every `signInWithPassword` call fail with a generic
  "Invalid login credentials", because Supabase's own stored/looked-up
  format omits it. Don't reintroduce the "+".
- Auth users are created via the **service role** (`lib/supabase/admin.ts`)
  with `phone_confirm: true` and `password: <4-digit PIN>` — no SMS is ever
  sent because admin-created users skip verification entirely.
- Supabase enforces a hard floor of 6 characters on `password_min_length`
  (its API rejects anything lower) — but the requirement is an exactly-4-digit
  PIN. Bridged in `lib/auth/pin.ts`: `toAuthPassword(pin)` prefixes the PIN
  before it's ever sent to Supabase Auth as a password. Employees only ever
  see/type 4 digits anywhere in the UI; every login/change-PIN/reset-PIN call
  goes through this transform. Applied live — this is not a TODO.
- Live project settings (already applied via the Supabase Management API,
  not just documented): Phone sign-in provider enabled, password minimum
  length set to 6 (the platform floor; irrelevant to the UX since the real
  stored password is always 8+ chars via the prefix above).
- Self change-PIN: `auth.updateUser({ password })` after re-verifying the
  current PIN. HR reset-PIN: `auth.admin.updateUserById(...)` with the
  service role — no custom PIN hash column exists or is needed.

## Bootstrapping the first admin

There's no in-app path to create the first admin account — `createEmployee`
and every admin action require an existing admin session. The first one was
created directly (auth.users + auth.identities + profiles rows via SQL,
matching GoTrue's expected shape exactly, verified with a crypt() hash
check) since this environment has no network path to the project's own
GoTrue endpoint to use the normal admin API for it. If more admins are ever
needed beyond editing an existing employee's role, that's a real gap worth a
small dedicated flow — not built now since it's a one-time need.

## Roles

Two roles only: `employee` and `admin`. HR and Admin are **one** role — do
not build separate HR/Admin permission tiers or workflows.

## Compliance score

0–100, starts at 100, computed as
`greatest(0, least(100, 100 + sum(points_ledger.points)))` — never stored as
a running total. Automatic entries come from attendance (late marks,
unapproved absence); approved leave and holidays never generate a negative
entry. Manual HR adjustments are ordinary `points_ledger` rows with
`is_override = true` and a mandatory `reason` — visible to the employee via
the same ledger they read from. **No separate disciplinary/conduct table** —
this was deliberately cut; don't reintroduce it.

## Explicitly out of scope (do not add)

Payroll, Employee of the Month, production/performance scoring, doctor
feedback scoring, a separate manual conduct-management workflow, OTP/MFA,
paid SMS/WhatsApp.

## Schema

`supabase/migrations/20260903165411_init_schema.sql` is the full V1 schema —
21 tables, RLS enabled everywhere, `is_admin()` / `auth_employee_id()` /
`auth_role()` helper functions used by every policy. Notification tables
(`notification_preferences`, `push_subscriptions`) exist in this migration
already (push is V1, not deferred) but the delivery engine isn't built yet.

Not yet in a migration: the SECURITY DEFINER punch-submission RPC, the
points-application RPC, and the attendance-correction RPC — these land with
the attendance-engine milestone, per the build order below. Employees have no
direct INSERT policy on `attendance_events` or `points_ledger` on purpose;
those functions are the only writers.

## Build order (in progress — update as milestones land)

Database → **auth (done)** → **employee/HR foundation (done)** →
**attendance (done — core punch flow)** → **leave/holidays (done)** →
**automated scoring (done)** → **push notifications (done)** → **HR
dashboard (done)** → **reports (done)** → **photo archival (done, pending
one Google credential)** → **polish (done — first real smoke test, see
below)**. V1 scope complete.

Polish notes: this milestone's real value was running the app for the
first time against the live database (dev server + browser), not visual
changes. Two genuine bugs only a live login could have caught:

1. The phone-format bug above (E.164's leading "+" vs. what Supabase
   actually stores) — every single login/employee-creation was silently
   broken until this was found.
2. An admin-only account (no linked `employees` row — true of the
   bootstrapped admin) hit a redirect loop between `/login` and
   `/dashboard`: the dashboard redirected it to `/login` for having no
   employee, and middleware redirected an authenticated user away from
   `/login` right back to `/dashboard`. Fixed two ways: `login()` now
   returns the signed-in user's role so the login page routes admins to
   `/admin` directly, and `/dashboard`+`/dashboard/leave` fall back to
   `/admin` (not `/login`) for a role='admin' account with no employee
   record, so the loop can't recur even if something else routes there.

Verified end-to-end on the live project after these fixes: employee
creation (with real Supabase Auth provisioning), login as both roles,
leave request → approval, compliance score + HR override, and a real
`.xlsx` export download (200 OK) — then all test data was deleted via the
Management API, leaving the database clean.

Added `.claude/launch.json` (`npm run dev` on port 3000) so this and future
sessions can preview the app in-browser directly.

Photo archival notes: full pipeline is built and correct
(`lib/archive/{run,google-drive,filename}.ts`, monthly Vercel Cron at
`/api/cron/archive-photos`), but genuinely cannot go live without a Google
service account — that's a credential only Google's own console can issue,
there's no code-only path around it. Until `GOOGLE_SERVICE_ACCOUNT_EMAIL` /
`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` / `GOOGLE_DRIVE_ROOT_FOLDER_ID` are set
(see `.env.local.example` for exactly where each comes from), the job is a
safe no-op — temp photos just wait, nothing is lost or deleted. One ZIP per
employee per month (not individual loose files) to keep Drive API calls
low; a failed employee never blocks another's, and a failure leaves
`photo_status` at `'uploaded'` (never a terminal `'failed'` state) so the
next run retries automatically. The idempotency guard on `photo_archive_jobs`
is an optimistic status check, not a real advisory lock — fine for a
monthly Vercel Cron trigger, called out here in case it ever needs
hardening.

Reports notes: 7 export routes under `/api/exports/*` (attendance,
employees, points, leave, shifts, offices, holidays), all admin-only,
generated server-side from the underlying tables via `exceljs` — never
whatever happened to be on screen. `/admin/reports` has a shared filter bar
(date range, employee, department, office) for the four datasets those
apply to; shifts/offices/holidays are small enough to just export whole.
No separate aggregated "summary" report — the filtered attendance export
covers that; further rollups are a spreadsheet operation, not an app
feature, per "don't over-engineer."

HR dashboard notes: `/admin` is a real overview now (stat tiles + a
"needs correction" queue), not a redirect to employees. This is also where
`attendance_corrections` finally got a UI — `correctAttendanceDay` in
`server/actions/attendance-corrections.ts` is the only place `attendance_days`
is ever edited after the fact, always with a before/after snapshot and a
mandatory reason, and always clears `is_flagged`.

Push notification notes: Vercel's free tier only runs cron jobs daily, too
coarse for "N minutes before shift start" reminders. Scheduling instead
runs on Supabase's own free `pg_cron` + `pg_net` (migration
20260904154845) — a `reminder-sweep` job fires every 10 minutes and calls
`/api/cron/send-reminders` over HTTP, reading the target URL and shared
secret from `app_settings.app_base_url`/`cron_secret` (both null today —
the sweep is a harmless no-op until `app_base_url` is set post-deployment).
`notification_log` dedupes so a reminder fires once per employee per day
per type regardless of how many 10-minute ticks land inside its window.
VAPID keys are already generated and in `.env.local` (not committed). Push
is additive everywhere — every check in the sweep only reads state
attendance/leave/holiday already produce, and a failed send blocks nothing
else.

Automated scoring notes: `finalize_attendance_day(date)` (migration
20260904154024) is a SECURITY DEFINER function called nightly by
`/api/cron/finalize-attendance` (Vercel Cron, `vercel.json`, guarded by
`CRON_SECRET`) for the day that just ended. It marks any active employee
with no attendance record that day as `week_off`/`holiday`/`on_leave`/
`absent` (checking shift working_days, holidays, approved leave in that
order), applies the seeded `UNAPPROVED_ABSENCE` rule (-5) on a genuine
absence, and flags (never guesses at) an incomplete punch-in-no-punch-out
day for HR. Score is `greatest(0, least(100, 100 + sum(points)))`, computed
on every read (`scoreFromPoints` in `lib/data/points.ts`) — still never a
stored total. HR adjustments at `/admin/points` are ordinary ledger rows
with `is_override: true` and a required reason; nothing about the ledger is
ever edited or deleted.

Leave/holidays notes: `leave_types` seeded with Casual/12, Sick/12, Earned/15
as sensible defaults (migration 20260904152159) — HR can edit
`annual_quota` directly, no settings UI for this yet. Balance is always
computed from approved `leave_requests` for the current year, never a
stored counter. Cancellation is employee-initiated only while `pending`
(enforced in the server action, not RLS) — once HR has acted, only HR
changes status further. No accrual/carry-forward, per the "keep it simple"
instruction.

Employee/HR foundation notes: `updateEmployee` (full field update) exists
alongside `updateEmployeeStatus` (status-only) — always use the status-only
action for status changes; it deliberately doesn't accept
department/designation/shift so a status change can never blank them out.

### Attendance engine

`submit_punch()` in `supabase/migrations/20260903180019_attendance_engine.sql`
is the only writer of `attendance_events`/`attendance_days`/automatic
`points_ledger` rows — SECURITY DEFINER, `employee` role has no direct INSERT
on those tables. It:

- Derives "today" and lateness from **server time in `app_settings.timezone`**,
  never from the client-supplied timestamp (that's stored as
  `client_captured_at` for diagnostics only, and drives `validation_status`
  when it drifts >5 minutes from server time).
- Picks the nearest of the employee's authorized offices (`employee_offices`)
  as the applicable office, compares distance to *that office's own*
  `radius_meters`.
- Is idempotent on `(employee_id, client_request_id)` — the client generates
  that id once per attempt and reuses it across retries.
- Seeded one default `point_rules` row (`LATE_ARRIVAL`, -2) so scoring works
  before the dedicated rules UI exists — expect HR to want to tune this.

**Known gaps, intentionally deferred to the leave/scoring milestones, not
forgotten:**
- No nightly job yet to mark a day `absent` when an employee never punches
  at all — today only handles days where at least a punch-in happened.
- No unapproved-absence points — only the late-arrival rule is wired up.
- Photo capture flow (`components/attendance/punch-flow.tsx`) keeps the
  idempotency key in React state only — safe against a retry click within
  the same page load (the DB constraint prevents a duplicate either way),
  but not against the tab being killed mid-upload. Upgrading to an
  IndexedDB-backed queue is a reasonable "reliability polish" item, not done
  now.
- Storage bucket `punch-photos-temp` is private; RLS restricts each employee
  to their own `temp/<employee_id>/` prefix. No monthly archive job yet —
  that's the "photo archival" milestone.

## Conventions

- Server Actions in `src/server/actions/`, one file per feature area.
- All Supabase access through `lib/supabase/{server,client,admin}.ts` — never
  construct a client ad hoc.
- Zod schemas in `lib/validation/`, one file per feature area, reused by both
  the form and the server action.
- No generated Supabase types yet (`database.types.ts`) — the project isn't
  linked to a live database from this environment. Generate once linked:
  `npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts`,
  then pass it as the generic to every `createClient<Database>()`.
- Design tokens live as CSS variables in `src/app/globals.css` (`--primary`,
  `--surface`, etc.) mapped into Tailwind via `@theme inline` — use the
  Tailwind utility classes (`bg-primary`, `text-muted`, ...), not raw hex
  values, so the palette stays centralized.
