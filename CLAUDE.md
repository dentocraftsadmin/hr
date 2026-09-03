# CraftsHR — build notes for Claude

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
  matching `auth.users.phone` is the E.164 form (`+91` + the 10 digits) —
  conversion happens only in `lib/auth/phone.ts`.
- Auth users are created via the **service role** (`lib/supabase/admin.ts`)
  with `phone_confirm: true` and `password: <4-digit PIN>` — no SMS is ever
  sent because admin-created users skip verification entirely.
- This requires two one-time Supabase Dashboard settings (see README) — they
  are outside what code/migrations can set, so verify them before testing
  login against the real project.
- Self change-PIN: `auth.updateUser({ password })` after re-verifying the
  current PIN. HR reset-PIN: `auth.admin.updateUserById(...)` with the
  service role — no custom PIN hash column exists or is needed.

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

Database → **auth (done)** → employee/HR foundation → attendance → leave/holidays
→ automated scoring → push notifications → HR dashboard → reports → photo
archival → polish.

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
