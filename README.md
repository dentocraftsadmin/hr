# CraftsHR

Attendance, leave, and compliance-score HR app for ~60 employees. Next.js (App
Router) + Supabase (Postgres, Auth, Storage) + Google Drive for photo
archival. See `CLAUDE.md` for the architecture decisions this build follows.

## Setup

```bash
npm install
cp .env.local.example .env.local   # fill in the Supabase service role key
npm run dev
```

## Database

Schema lives in `supabase/migrations/` and has already been applied to the
live project (via the Supabase Management API — this repo's git history
predates a CLI/local-Supabase setup, so there's no `supabase link` step to
run). To apply a *new* migration after this point, add a timestamped file
under `supabase/migrations/` following the existing naming convention.

Live project settings this schema/auth model depends on (already applied,
not TODOs): Phone sign-in provider enabled, password minimum length at 6 —
see `CLAUDE.md` for why 6 and not 4.

## After deploying

Push notification scheduling (Supabase `pg_cron`) is a no-op until the app
has a real URL. Once deployed:

```sql
update app_settings set app_base_url = 'https://your-deployed-domain.com' where id = 1;
```

`app_settings.cron_secret` is already set to match `CRON_SECRET` — also add
`CRON_SECRET` (and the `VAPID_*` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` values
from `.env.local`) to the Vercel project's environment variables so
`/api/cron/*` and Web Push both work in production, not just locally.

## Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```
