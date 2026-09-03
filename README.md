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

Schema lives in `supabase/migrations/`. Apply with the Supabase CLI once the
project is linked:

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

One-time Supabase Dashboard settings this schema/auth model depends on:

- **Authentication → Sign In / Providers → Phone**: enabled (no SMS provider
  needed — accounts are created server-side with `phone_confirm: true`, so no
  OTP is ever sent).
- **Authentication → Policies → Minimum password length**: set to `4` (PINs
  are 4 digits, enforced by the app; Supabase's own minimum must not reject
  them).

## Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```
