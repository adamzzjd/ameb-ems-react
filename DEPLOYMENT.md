# 🚀 AMEB EMS — Deployment & Demo Readiness

Everything needed to take the system from development to a formal presentation
to the Board, and then to production. Work through the checklist top to bottom.

---

## 1. What the system includes (for the demo)

- **Staff Portal** — employee register (search/filter/group/sort), CSV import/export,
  print views, stations, cadres, learning centres, facilitator registry, LGA area
  officers (one per LGA, assigned from staff). Staff pay/payroll is deliberately
  **out of scope** — no salary data is stored or produced.
- **Retirement & Tenure** — age 60 / 35-years-of-service projections with a dedicated view.
- **Data Quality** — officers missing key fields + duplicate-name detection (with edit/export).
- **CMS + Public Website** — site content editor, programs, news, team, gallery (animated
  slideshow), downloads, contact inbox, enrolment stats — all live on the public site.
- **Security & Governance** — role-based access (11 roles incl. partner tenants, RLS in the
  database), append-only **audit log** (who did what, super-admin view), Sentry error tracking.
- **Partner Organisations** — register NGOs/LGAs/CSOs, give them scoped portal logins
  (`manage-users` edge function), record centre ownership, and approve partner-created
  centres before they appear publicly.
- **Engineering** — 139 unit tests, browser E2E smoke tests, CI on every push, JSON backup.

## 2. Pre-deployment checklist (one-time)

| # | Task | Where |
|---|------|-------|
| 1 | Supabase SQL scripts in order: `setup.sql`, `setup_ems.sql`, `setup_storage.sql`, `setup_facilitators.sql`, `setup_lga_officers.sql`, `setup_enrolments.sql`, `setup_audit.sql`, `setup_partners.sql`, **then** `setup_rls.sql` last | Supabase → SQL Editor |
| 2 | Promote your account: uncomment the super-admin line in `setup_rls.sql` (or run the UPDATE) | Supabase → SQL Editor |
| 3 | Create an E2E test account (admin+) if you want portal tests | Supabase → Authentication → Users |
| 4 | Verify image columns: `npm run diag:images` should show 0 base64 / 0 storage URLs | Local terminal |
| 5 | Review the **Audit Log** page to confirm writes are being recorded | Portal → Settings → Audit Log |

## 3. Environment variables

**Local `.env`** (already set up on the dev machine — see `.env.example`):

```
VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY      required
VITE_CLOUDINARY_CLOUD_NAME / _UPLOAD_PRESET      required for image uploads
VITE_SENTRY_DSN                                  optional — error tracking
VITE_PLAUSIBLE_DOMAIN                            optional — site analytics
E2E_USER_EMAIL / E2E_USER_PASSWORD               optional — E2E portal tests
```

**Vercel (Settings → Environment Variables → Production + Preview)** — add the same
`VITE_*` values as local. These are the ones that matter for the deployed site.

> ⚠️ Remember the `.env` lesson: env vars are read **at build/deploy time**.
> After changing Vercel env vars, redeploy.

## 4. Deploy to Vercel

1. Push `main` — Vercel auto-deploys (SPA rewrites are already in `vercel.json`).
2. **CI runs on every push** (`.github/workflows/ci.yml`): lint → 139 tests → build,
   plus E2E smoke tests (public site always; portal tests if the E2E secrets are set).
3. Verify the live site: public landing page, login, one employee add/edit/delete.

## 5. Sentry (production error debugging)

1. In Sentry → **Settings → Projects → your project → Client Keys**: confirm the DSN
   (already in local `.env` + Vercel as `VITE_SENTRY_DSN`).
2. **Source maps** (readable stack traces): create an auth token (Settings → Auth Tokens,
   scopes `project:releases`, `project:read`), then set in **CI secrets**:
   `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` — the Vite plugin uploads maps
   and creates releases automatically on the next build. Set `VITE_APP_RELEASE` to the
   git SHA in the deploy so every error is tagged to a build.
3. Sanity check: trigger an error in production, open Sentry → Issues, confirm the
   release tag and readable stack trace.

## 6. Optional extras

- **Plausible analytics** — register the domain, set `VITE_PLAUSIBLE_DOMAIN`, redeploy.
- **Register backup** — Portal → sidebar → **Backup Register** downloads a full JSON
  backup of every table (employees, stations, cadres, centres, facilitators, LGA area
  officers, partner organisations, organisation members, CMS, …).
  Do this before any major change, and keep copies off-site.

## 7. Suggested demo flow (to the Board)

1. **Public site** — landing page: hero stats (live from enrolment data), programs,
   gallery slideshow, "Find a Learning Center" directory, contact form.
2. **Staff portal** — sign in; dashboard (KPIs, gender distribution); search the register;
   open a profile (photo, tenure, retirement date); the **Retirement & Tenure** view.
3. **CMS** — edit a line of site content and publish (proves the live update + cache).
4. **Governance** — show the **Audit Log** (their visit is now in it) and the **Backup**
   action; mention roles + RLS and that Sentry monitors errors.

## 8. Go-live day

- Run the backup before making any changes.
- Watch the first Vercel deploy's CI results.
- After launch: check Sentry for any production-only errors, and the audit log
  for unexpected writes.
