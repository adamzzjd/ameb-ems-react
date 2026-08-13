# 🏛 AMEB EMS — Migration Progress Report

> **From:** `ameb-ems/` (Vanilla JS)  
> **To:** `ameb-ems-react/` (React 19 + TypeScript 6 + Vite 8)  
> **Last updated:** August 13, 2026 (Phase 14 — E2E tests, Data Quality, backup, deployment readiness)

---

## ✅ Phase 1: Foundation (100% Complete)

| Step | Status | Notes |
|------|--------|-------|
| 1.1 Vite scaffold | ✅ Done | React 19 + TypeScript 6 + Vite 8 |
| 1.2 TypeScript types | ✅ Done | Full type definitions in `src/types/index.ts` |
| 1.3 Supabase client | ✅ Done | `client.ts`, `employees.ts`, `stations.ts`, `cadres.ts`, `centres.ts`, `cms.ts` |
| 1.4 UI components | ✅ Done | Avatar, Badge, Button, Card, Dialog, Input, Modal, Select, Tabs, Table, Skeleton, Sonner |
| 1.5 Routing & Auth | ✅ Done | Auth context, Login, AppShell, Sidebar, Topbar (state-based routing) |

## ✅ Phase 2: Core EMS Pages (100% Complete)

| Step | Status | Notes |
|------|--------|-------|
| 2.1 Dashboard | ✅ Done | Stats cards, bar charts, recent employees table |
| 2.2 Employee list + filters | ✅ Done | Search, LGA/Station/Grade filters, sort, pagination (50/page) |
| 2.3 Employee CRUD | ✅ Done | Form modal, Profile modal, Delete confirmation dialog |
| 2.4 Grouped views | ✅ Done | Station/LGA/Grade via `<GroupView>` component |
| 2.5 CSV Import/Export | ✅ Done | `CsvImportModal` + Export, wired to Sidebar + Topbar |
| 2.6 Print | ✅ Done | `print.ts` utility with CSS print styles |
| 2.7 Stations/Cadres/Centres | ✅ Done | Full CRUD with filterable tables, print views |
| 2.8 Appointment view | ✅ Done | Grouped by year of first appointment |

## ✅ Phase 3: CMS Admin (100% Complete)

| Step | Status | Notes |
|------|--------|-------|
| CMS Dashboard | ✅ Done | Stats overview with navigation to all CMS sections |
| Site Content editor | ✅ Done | Full text editor for hero, about, mission, vision, contact |
| Programs CRUD | ✅ Done | Reorderable list via `CmsListManager` |
| News CRUD | ✅ Done | Reorderable list with icon, date, excerpt |
| Team CRUD | ✅ Done | Reorderable list with auto-generated initials |
| Gallery manager | ✅ Done | Image upload (base64), wide/tall options, reorderable |
| Downloads CRUD | ✅ Done | Reorderable list with meta info |
| Contact Inbox | ✅ Done | Read/unread tracking, message detail, search, delete |

## ✅ Phase 4: Public Website (Complete)

| Step | Status | Notes |
|------|--------|-------|
| Landing page | ✅ Done | Hero, About, Programs, News, Gallery, Downloads, Contact, Footer |
| CMS data integration | ✅ Done | Fetches live from Supabase with fallback defaults |
| Contact form submission | ✅ Done | Writes to Supabase `cms_contacts` table |
| Mobile responsive | ✅ Done | Hamburger nav, responsive grids, stacked layouts |
| Scroll animations | ✅ Done | Framer-motion fade-in on scroll for all sections |

## ✅ Phase 5: Polish & Testing (100% Complete)

| Step | Status | Notes |
|------|--------|-------|
| TypeScript strict mode | ✅ Done | `strict: true` enabled, zero errors |
| Unit tests | ✅ Done | 37 tests across 6 test files (Vitest + RTL) |
| Responsive design audit | ✅ Done | Mobile nav, responsive grids, font sizes, section padding |
| Bundle optimization | ✅ Done | Code-splitting via `React.lazy()`, chunk warning limit tuned |
| Code-splitting CMS pages | ✅ Done | All pages lazy-loaded in `App.tsx` |
| Toast system upgrade | ✅ Done | Replaced custom toasts with sonner for better UX |
| Scroll animations | ✅ Done | Framer-motion fade-in animations on Landing page |

## ✅ Phase 6: Deployment & Performance (Complete)

| Step | Status | Notes |
|------|--------|-------|
| UUID auto-generation | ✅ Done | All insert/upsert operations generate crypto.randomUUID() client-side |
| localStorage CMS caching | ✅ Done | `useCmsData` caches data — instant render on return visits |
| 30s auto-refresh | ✅ Done | Landing page auto-refreshes CMS data in background every 30s |
| CMS cache invalidation | ✅ Done | All 6 CMS pages call `clearCmsCache()` after save/delete/reorder |
| Landing page scroll fix | ✅ Done | Native body scrolling, scrollMarginTop on all sections, fixed header offset |
| Hero "ALL" text fix | ✅ Done | Uppercase + bold + letter-spacing on gold gradient hero title |
| Git + GitHub setup | ✅ Done | Repo initialized, branch renamed `master` → `main`, pushed |
| Vercel deployment config | ✅ Done | SPA rewrites, build script fixed, auto-deploy from GitHub |
| Supabase env security | ✅ Done | `.env` added to `.gitignore`, secrets never committed |

## ✅ Phase 7: Role-Based Access Control (100% Complete)

| Step | Status | Notes |
|------|--------|-------|
| 7.1 Role model & permissions | ✅ Done | `src/lib/roles.ts` — 4 roles (super_admin, admin, data_collector, staff), 9 permissions, `can()`/`roleAtLeast()`/`normalizeRole()` |
| 7.2 Auth context upgrade | ✅ Done | `useAuth` exposes `role` + `can()`; role read from `app_metadata` only (client-editable `user_metadata` no longer trusted); `isAdmin` derived for backward compat |
| 7.3 Role-gated UI | ✅ Done | Sidebar sections/actions per-permission, granular `canEdit`/`canDelete`/`canAdd` props, route guards in `App.tsx`, role label in footer |
| 7.4 Row Level Security | ✅ Done | `setup_rls.sql` — RLS enabled on all 11 tables, `auth_role()` JWT helper, per-role policies, NULL-safe legacy role migration |
| 7.5 User management | ✅ Done | `manage-users` edge function (service-role, super-admin gated, self-protection) + User Management page |
| 7.6 Tests | ✅ Done | 10 new permission-matrix tests (`roles.test.ts`) |

## ✅ Phase 8: Image Hosting — Cloudinary Migration (Complete)

| Step | Status | Notes |
|------|--------|-------|
| 8.1 Cloudinary-first upload service | ✅ Done | `src/supabase/storage.ts` — uploads to Cloudinary (unsigned preset, `f_auto/q_auto`) when configured, Supabase Storage fallback; Cloudinary URLs left in place on delete (unsigned presets can't delete) |
| 8.2 CMS uploads migrated | ✅ Done | Site Content, News, Team **and Gallery** now upload via `ImageUpload` (Cloudinary-first) — no more base64 in the DB for new uploads |
| 8.3 Employee photos migrated | ✅ Done | `EmployeeForm` uploads passport photos via `uploadImageToStorage` (URL in DB, replaces legacy base64 path) |
| 8.4 Legacy backfill script | ✅ Done | `scripts/migrate-images-to-cloudinary.mjs` — one-time migration of base64 + Supabase Storage images to Cloudinary; dry-run by default, `--commit` and `--delete-originals` flags |
| 8.5 Docs | ✅ Done | README Cloudinary setup + migration instructions, `.env.example` updated |

## ✅ Phase 8.5: Image Data Cleanup — Fresh Start (Complete)

| Step | Status | Notes |
|------|--------|-------|
| 8.5.1 Migration script keys wired | ✅ Done | `.env` now has `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` (script-only, non-`VITE_`, never committed) |
| 8.5.2 Migration script abandoned | ✅ Decided | Dry-run found images stored as huge base64 blobs (a 5-row gallery query alone took 51s) + slow link to Supabase; user chose a clean-slate re-upload instead (eats egress + too slow) |
| 8.5.3 Base64 + storage URLs purged | ✅ Done | SQL in Supabase editor cleared all `data:image/...` base64 and `/storage/v1/object/public/images/...` URLs from `cms_gallery`, `employees`, `cms_news`, `cms_team`, `site_content` — **no records deleted** |
| 8.5.4 Data verified intact | ✅ Done | 138 employees, all CMS rows present; full `select(*)` on employees dropped from ~38s/terminated → ~7s (latency-bound, payload now tiny) |
| 8.5.5 Dashboard restored | ✅ Done | Employee dashboard loads again (was blank because the huge base64 photo payload caused the query to be terminated) |
| 8.5.6 Cloudinary-first uploads verified | ✅ Done | Test upload to Cloudinary succeeded (3.4s); `storage.ts` uploads via unsigned preset `ameb_ems` with `f_auto,q_auto` + client-side resize |
| 8.5.7 `site_content`/`cms_news` anon reads | ✅ Done | RLS select policies for these two tables re-applied in the SQL editor (the `cms_content_select` + `cms_news_select` snippets from `setup_rls.sql`). User confirmed via full testing that CMS pages and the public site render correctly — anon reads now return rows. |

## ✅ Phase 8.6: Cloudinary-Only Image Hosting (Complete)

| Step | Status | Notes |
|------|--------|-------|
| 8.6.1 Supabase Storage fallback removed | ✅ Done | `src/supabase/storage.ts` is now Cloudinary-only — `IMAGE_BUCKET`, `supabase.storage` upload/getPublicUrl/remove paths deleted; uploads fail with a clear error if Cloudinary env vars are missing |
| 8.6.2 `deleteImageFromStorage` simplified | ✅ Done | Now a documented no-op (unsigned presets can't delete) — clean up in Cloudinary Media Library |
| 8.6.3 `setup_storage.sql` slimmed | ✅ Done | Removed `images` bucket creation + `images_anon_all` policy; keeps only the image URL column additions |
| 8.6.4 Legacy image purge script | ✅ Done | `supabase/purge_non_cloudinary_images.sql` — schema-aware (checks `information_schema` first; skips missing columns instead of erroring); review counts first, then uncomment the UPDATE block |
| 8.6.5 Schema drift fixed | ✅ Done | Live DB was missing `cms_gallery.image` (and possibly `employees.photo`) because `CREATE TABLE IF NOT EXISTS` never adds columns to existing tables → `setup_storage.sql` now adds **all seven** image columns idempotently; `diag-count.mjs` reports "missing column" instead of crashing |
| 8.6.6 Docs + diagnostics | ✅ Done | README + `.env.example` rewritten for Cloudinary-only; `npm run diag:images` wired to `scripts/diag-count.mjs` |
| 8.6.7 DB cleanup verified | ✅ Done | Ran `setup_storage.sql` (added missing `cms_gallery.image` etc. — schema drift) + purge Step 2 in SQL editor. `npm run diag:images` confirms **base64=0 and supabaseStorage=0 on all 7 image columns** — database is Cloudinary-only (image fields all NULL; every new upload goes straight to Cloudinary). |

## 🚀 Phase 9: Facilitator Registry & Multi-Facilitator Centres (Code Complete)

> **One-time go-live:** run `supabase/setup_facilitators.sql` in the Supabase SQL Editor, then re-run `supabase/setup_rls.sql` (adds policies for the two new tables). The script migrates existing `centres.facilitator` text into the registry and links it.

| Step | Status | Notes |
|------|--------|-------|
| 9.1 DB tables + legacy migration | ✅ Done | `supabase/setup_facilitators.sql` — creates `facilitators` + `centre_facilitators` (many-to-many, cascade deletes); converts distinct legacy `centres.facilitator` names into registry rows, links each centre, then drops the old column (runs once — guarded by column existence) |
| 9.2 RLS policies | ✅ Done | `setup_rls.sql` — new `4.5` section: `facilitators` + `centre_facilitators` read for any signed-in user, admin+ write (same model as stations/cadres) |
| 9.3 Types + Supabase service | ✅ Done | `Facilitator`/`CentreFacilitator` types (`Centre.facilitator` removed); `src/supabase/facilitators.ts` — CRUD + `dbLoadCentreFacilitators()` + `dbSetCentreFacilitators()` (delete+re-insert replace) |
| 9.4 Facilitator registry page | ✅ Done | `FacilitatorsManager.tsx` — searchable CRUD (name, gender, phone, LGA, community, remarks), view modal shows assigned centres, delete warns about unlinking |
| 9.5 Multi-assign in CentresManager | ✅ Done | `CentresManager.tsx` — searchable multi-select facilitator picker with inline quick-add (creates + assigns), chips in table (max 3 + count), view modal, both print views; search matches facilitator names; "Facilitators" stat card |
| 9.6 Routing + navigation | ✅ Done | `facilitators` page in `App.tsx` (lazy, `settings.manage` guard + prop), Sidebar "Manage Facilitators" (Settings), PAGE_TITLES entry, cross-links between Centres ↔ Facilitators pages |
| 9.7 Docs | ✅ Done | README schema + setup order updated (run `setup_facilitators.sql`, then `setup_rls.sql` last) |

## 🚀 Phase 10: Enrolment Stats, Public Centre Directory & Live Site Stats (Code Complete)

> **One-time go-live:** run `supabase/setup_enrolments.sql` in the Supabase SQL Editor, then re-run `supabase/setup_rls.sql` (adds policies for `enrolment_stats`).

| Step | Status | Notes |
|------|--------|-------|
| 10.1 DB table + public view | ✅ Done | `setup_enrolments.sql` — `enrolment_stats` (year UNIQUE, learners_enrolled, certified, dropped_out, no_exam, ngos text[]) + `public_centres` view (safe public projection of centres with facilitator names, no internal remarks; granted to anon) |
| 10.2 RLS policies | ✅ Done | `setup_rls.sql` — `enrolment_stats` public read (Landing hero needs it with anon key), admin+ write |
| 10.3 Types + Supabase service | ✅ Done | `EnrolmentStat`/`PublicCentre` types; `src/supabase/enrolments.ts` — CRUD + `dbLoadPublicCentres()` |
| 10.4 CMS manager | ✅ Done | `CmsEnrolments.tsx` — summary cards (total enrolled/certified/dropped/no-exam), per-year table, add/edit modal with NGOs textarea (one per line), delete confirm, NGO partner chips |
| 10.5 Routing + navigation | ✅ Done | `cms-enrolments` page in `App.tsx` (lazy, cms.edit guard), Sidebar "Enrolment Stats" (Content Manager), PAGE_TITLES, CMS Dashboard card |
| 10.6 Public centre directory | ✅ Done | Landing "Find a Learning Center" rebuilt as a live directory: search by name/ward/community/LGA, LGA filter chips derived from the register, centre cards (type, status, location, phone, facilitators); removed the "Interactive map coming soon" placeholder; new `centres` nav link; "Find a Learning Center" CTAs now scroll to the directory |
| 10.7 Live hero stats | ✅ Done | Hero counters now live: Learners Enrolled (sum of `enrolment_stats`), Learning Centres + LGAs (from `public_centres`), Active Programs (CMS programs) — with static fallbacks until data exists |
| 10.8 Hausa toggle removed | ✅ Done | Removed the incomplete EN/HA language toggle (state, header + mobile buttons, all `lang ===` ternaries) so the site no longer looks half-translated |
| 10.9 Docs | ✅ Done | README schema + setup order updated (`setup_enrolments.sql` before `setup_rls.sql`) |

## 🚀 Phase 11: CI, Audit Trail, Monitoring & Test Coverage (Complete)

> **One-time go-live:** run `supabase/setup_audit.sql` in the Supabase SQL Editor, then re-run `supabase/setup_rls.sql`. Optionally add `VITE_SENTRY_DSN` (Sentry) and `VITE_PLAUSIBLE_DOMAIN` (Plausible) — both are opt-in.

| Step | Status | Notes |
|------|--------|-------|
| 11.1 CI pipeline | ✅ Done | `.github/workflows/ci.yml` — runs `npm ci` → lint → tests → build on every push to `main` and on PRs, so broken code can never silently reach the Vercel auto-deploy |
| 11.2 Audit trail | ✅ Done | `supabase/setup_audit.sql` (`audit_log` append-only table — insert by any signed-in user, select by super_admin only, no update/delete policies) + `src/supabase/audit.ts` (`logAudit()` best-effort helper + `dbLoadAuditLog()`) |
| 11.3 Audit wired into all writes | ✅ Done | Every admin write path logs create/update/delete/import/reset/assign/mark_read: employees, stations, cadres, centres, facilitators (+ centre assignments), enrolment stats, all CMS content + inbox actions — logging never breaks the primary operation |
| 11.4 Audit Log page | ✅ Done | `src/pages/AuditLog.tsx` — super_admin-only viewer (new `audit.view` permission, RLS-protected), search + table filter + refresh, last 500 entries, action badges, user/role/row-id/details columns |
| 11.5 Service + CSV tests | ✅ Done | 21 new tests (68 total): `registerServices.test.ts` (centres/facilitators/enrolments CRUD with mocked Supabase — call shapes, defaults, audit on success, no audit on failure) + `CsvImport.test.ts` (column mapping, value mapping, duplicate-safe import); CSV helpers extracted to `src/lib/csv.ts` |
| 11.6 Error monitoring | ✅ Done | `src/lib/sentry.ts` — optional Sentry via `VITE_SENTRY_DSN` (lazy-loads the SDK only when set), captures uncaught exceptions/rejections + ErrorBoundary failures, PII scrubbed. **Verified live** — DSN configured, test event accepted by Sentry ingest (HTTP 200), and a real capture confirmed from the running app |
| 11.7 Site analytics | ✅ Done | Optional cookie-less Plausible script loaded when `VITE_PLAUSIBLE_DOMAIN` is set |
| 11.8 Docs | ✅ Done | README: `setup_audit.sql` in setup order, `audit_log` schema row, Monitoring & Analytics section; `.env.example` updated |
| 11.9 Sentry go-live | ✅ Done | `VITE_SENTRY_DSN` added to `.env` (gitignored — never committed); DSN validity + app wiring verified. A dev-only "Send Test Error" button was used to confirm capture end-to-end, then removed before commit |

## 🚀 Phase 12: Logo & Favicon, Gender Reporting, Filtered Export, My Account, Retirement Tracking (Complete)

> **One-time go-live:** re-run `supabase/setup_ems.sql` in the Supabase SQL Editor (adds the `employees.gender` column idempotently).

| Step | Status | Notes |
|------|--------|-------|
| 12.1 Logo everywhere | ✅ Done | CMS `logo_url` now drives the public header/footer, program/news detail pages, login, the staff-portal sidebar and the favicon (`src/lib/favicon.ts` runtime swap) — with the gold GraduationCap fallback wherever no logo is set; `index.html` now ships a `<link rel="icon">` |
| 12.2 Gender field | ✅ Done | `employees.gender` column (idempotent ALTER in `setup_ems.sql`), form select, profile display, CSV import (`gender`/`sex` headers) + export |
| 12.3 Gender reporting | ✅ Done | Dashboard "Gender Distribution" card (Male/Female split bar + counts, "not stated" when missing) |
| 12.4 Filtered CSV export | ✅ Done | Export on the Employees page now downloads the current filter/sort view (with a toast confirming the row count); elsewhere it still exports the full register |
| 12.5 My Account | ✅ Done | `src/pages/MyAccount.tsx` — any signed-in user sees their email/role and changes their own password (current-password verification + confirm match) |
| 12.6 Retirement & tenure | ✅ Done | `src/lib/retirement.ts` (pure, tested): age 60 / 35 years of service, whichever first. New **Retirement & Tenure** page (summary cards, search, status chips, sortable list) + Years of Service / Retirement Date on the employee profile |
| 12.7 Tests | ✅ Done | 10 new retirement tests (78 total) — age, service years, earlier-of rule, retired/due-soon flags; timezone-safe date parsing |
| 12.8 Docs | ✅ Done | README employees schema row updated (gender, retirement source fields) |

## 🚀 Phase 13: Animated Gallery Slideshow + Schema Drift Fix (Complete)

| Step | Status | Notes |
|------|--------|-------|
| 13.1 Schema drift fix | ✅ Done | Live DB was missing `cms_programs.image` (the Programs cover-photo feature predates it; `CREATE TABLE IF NOT EXISTS` never retrofits columns). Added the idempotent ALTER to `setup_storage.sql` (now 8 image columns) + README field list. Verified live: all 8 image columns present across 6 tables |
| 13.2 Animated slideshow | ✅ Done | `GallerySlideshow` rebuilt in `Landing.tsx`: direction-aware slide+fade transitions (variants + custom direction), Ken Burns slow zoom on the active image, gold autoplay progress bar synced to the 5s timer, animated caption over a gradient scrim, frosted-glass arrows with hover/press feedback, direction-aware dot navigation |
| 13.3 Accessibility | ✅ Done | All motion respects `prefers-reduced-motion`; pauses on hover; aria-labels kept on arrows/dots; counter retained |
| 13.4 Verification | ✅ Done | Typecheck + lint (0 errors) + build pass; headless-Chrome render confirmed gallery loads, autoplay advances (counter 1→2), arrows render, no errors |
| 13.5 Custom favicon | ✅ Done | `public/favicon.svg` replaced with the board's own flame-of-knowledge mark (ADSMEB) — the tab icon now matches the brand |

## 🚀 Phase 14: E2E Tests, Data Quality, Backup & Deployment Readiness (Complete)

| Step | Status | Notes |
|------|--------|-------|
| 14.1 E2E tests | ✅ Done | `playwright.config.ts` uses the system-installed Chrome (`channel: 'chrome'` — no browser download, works in CI where Chrome is preinstalled). `e2e/public-site.spec.ts` (landing + slideshow) runs everywhere; `e2e/portal.spec.ts` (login, employee CRUD, retirement, My Account) skips gracefully without `E2E_USER_EMAIL`/`E2E_USER_PASSWORD`. `npm run test:e2e`; CI `e2e` job added |
| 14.2 Data Quality dashboard | ✅ Done | `src/lib/dataQuality.ts` (pure, tested) + `src/pages/DataQuality.tsx` — summary cards, per-field missing filters, duplicate-name detection, per-row Edit (opens the standard form) and CSV export of the current list |
| 14.3 Register backup | ✅ Done | `src/lib/backup.ts` — `fetchFullBackup()` pulls all 14 tables (missing tables degrade to null) + `downloadBackup()` JSON; sidebar action **Backup Register** (admin+) on the portal |
| 14.4 Production monitoring | ✅ Done | Sentry release stamping (`__APP_RELEASE__` via `VITE_APP_RELEASE`) + optional source-map upload via `@sentry/vite-plugin` (guarded — skipped when `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` unset); `.env.example` documented |
| 14.5 Deployment readiness | ✅ Done | `DEPLOYMENT.md` — full checklist: setup scripts, roles, env vars (local + Vercel), deploy, Sentry source maps, suggested Board demo flow, go-live day steps |
| 14.6 Tests | ✅ Done | 6 new data-quality tests (86 total) |
| 14.7 Docs | ✅ Done | README untouched this phase; `DEPLOYMENT.md` added; `.env.example` (E2E + Sentry build vars) updated |

---

## 📁 Source Files Created/Modified

### Tooling (2 files)
- `scripts/migrate-images-to-cloudinary.mjs` ✅ — One-time backfill: base64 + Supabase Storage images → Cloudinary (dry-run by default)

### Core (4 files)
- `src/App.tsx` ✅ — State-based routing, lazy loading, auth flow, permission-checked handlers + route guards
- `src/main.tsx` ✅ — Providers setup (Theme, Auth, Toast, Sonner)
- `src/index.css` ✅ — Tailwind v4, dark/light theme, custom scrollbars, print styles
- `src/types/index.ts` ✅ — All TypeScript interfaces (incl. `AppPage 'users'`, auth types)

### Supabase Services (6 files)
- `src/supabase/client.ts` ✅ — Supabase client initialization
- `src/supabase/employees.ts` ✅ — Employees CRUD + dbCheckTable
- `src/supabase/stations.ts` ✅ — Stations CRUD
- `src/supabase/cadres.ts` ✅ — Cadres CRUD
- `src/supabase/centres.ts` ✅ — Centres CRUD
- `src/supabase/cms.ts` ✅ — CMS tables CRUD (site_content, programs, news, team, gallery, downloads, contacts)

### Pages (22 files)
- `src/pages/Landing.tsx` ✅ — Public website with framer-motion animations
- `src/pages/Login.tsx` ✅ — Email/password auth
- `src/pages/UserManagement.tsx` ✅ — Super-admin user management (create users, assign roles, remove)
- `src/pages/Dashboard.tsx` ✅ — Stats overview
- `src/pages/Employees.tsx` ✅ — Filterable employee table
- `src/pages/EmployeeForm.tsx` ✅ — Add/edit employee modal
- `src/pages/EmployeeProfile.tsx` ✅ — Employee detail view
- `src/pages/CsvImportModal.tsx` ✅ — CSV import/export
- `src/pages/GroupView.tsx` ✅ — Grouped views (station/LGA/grade)
- `src/pages/Appointment.tsx` ✅ — By appointment date
- `src/pages/StationsManager.tsx` ✅ — Stations CRUD
- `src/pages/CadresManager.tsx` ✅ — Cadres CRUD
- `src/pages/CentresManager.tsx` ✅ — Learning centres CRUD (write controls gated by role)
- `src/pages/NotFound.tsx` ✅ — 404 page (also used for access-denied)
- `src/pages/cms/CmsDashboard.tsx` ✅ — CMS overview
- `src/pages/cms/SiteContent.tsx` ✅ — Content editor
- `src/pages/cms/CmsPrograms.tsx` ✅ — Programs manager
- `src/pages/cms/CmsNews.tsx` ✅ — News manager
- `src/pages/cms/CmsTeam.tsx` ✅ — Team manager
- `src/pages/cms/CmsGallery.tsx` ✅ — Gallery manager
- `src/pages/cms/CmsDownloads.tsx` ✅ — Downloads manager
- `src/pages/cms/CmsInbox.tsx` ✅ — Contact inbox

### UI Components (15 files)
- `src/components/ui/avatar.tsx`, `badge.tsx`, `button.tsx`, `card.tsx`, `dialog.tsx`
- `src/components/ui/dropdown-menu.tsx`, `input.tsx`, `label.tsx`, `scroll-area.tsx`, `select.tsx`
- `src/components/ui/separator.tsx`, `skeleton.tsx`, `sonner.tsx`, `table.tsx`, `tabs.tsx`, `textarea.tsx`
- `src/components/ui/Modal.tsx` — Legacy modal component

### Layout Components (4 files)
- `src/components/layout/AppShell.tsx` ✅ — Shell with sidebar + topbar (role-aware Add button)
- `src/components/layout/Sidebar.tsx` ✅ — Role-gated navigation, actions, and role label
- `src/components/layout/Topbar.tsx` ✅ — Top bar with breadcrumb
- `src/components/cms/CmsListManager.tsx` ✅ — Reusable CMS list CRUD manager

### Auth & Roles (6 files)
- `src/lib/roles.ts` ✅ — Role type, permission matrix, `can()`/`roleAtLeast()`/`normalizeRole()`
- `src/lib/__tests__/roles.test.ts` ✅ — 10 tests covering the full permission matrix
- `supabase/setup_rls.sql` ✅ — RLS enablement, per-role policies, legacy role migration
- `supabase/functions/manage-users/index.ts` ✅ — Edge function: list/create/set-role/delete users
- `supabase/config.toml` ✅ — Supabase CLI config (functions.manage-users)
- `src/hooks/useAuth.tsx` ✅ — Auth context exposing `role` + `can()` (see Hooks)

### Hooks (5 files)
- `src/hooks/useAuth.tsx` ✅ — Supabase auth context (role + `can()` from `app_metadata`)
- `src/hooks/useEmployees.ts` ✅ — Employee data management
- `src/hooks/useCmsData.ts` ✅ — CMS data with localStorage caching + 30s auto-refresh
- `src/hooks/useTheme.tsx` ✅ — Dark/light theme toggle
- `src/hooks/useToast.tsx` ✅ — Toast notifications (via sonner)

### Unit tests (12 files, 86 tests)
- `src/lib/__tests__/utils.test.ts` — cn() utility tests
- `src/lib/__tests__/roles.test.ts` — Role/permission matrix tests
- `src/lib/__tests__/retirement.test.ts` — Retirement & tenure math (age 60 / 35 years of service)
- `src/lib/__tests__/dataQuality.test.ts` — Completeness stats, missing fields, duplicate names
- `src/pages/__tests__/CsvImport.test.ts` — CSV import helpers (mapping, dedup)
- `src/pages/cms/__tests__/SiteContent.test.tsx` — CMS editor keeps focus while typing
- `src/components/__tests__/Button.test.tsx` — Button component tests
- `src/components/__tests__/Card.test.tsx` — Card component tests
- `src/components/__tests__/Input.test.tsx` — Input component tests
- `src/components/__tests__/ErrorBoundary.test.tsx` — Error boundary tests
- `src/hooks/__tests__/useToast.test.tsx` — Toast context tests
- `src/supabase/__tests__/registerServices.test.ts` — centres/facilitators/enrolments services with mocked Supabase

### E2E tests (Playwright, 6 specs)
- `e2e/public-site.spec.ts` — landing page renders core sections, gallery slideshow controls (no login)
- `e2e/portal.spec.ts` — dashboard, employee create/edit/delete, retirement view, My Account (skips without `E2E_USER_EMAIL`/`E2E_USER_PASSWORD`)

### Config Files
- `vercel.json` ✅ — SPA rewrites, Vite framework preset
- `.gitignore` ✅ — Excludes .env, .docx, temp files
- `tsconfig.app.json` ✅ — TS 6 strict mode with ignoreDeprecations
- `vite.config.ts` ✅ — React + Tailwind v4 + path alias

---

## 🚀 How to Run

```bash
cd ameb-ems-react
npm run dev       # Development server (localhost:5173)
npm test          # Run 86 unit tests
npm run test:e2e  # Run Playwright browser smoke tests
npm run build     # Production build
```

Make sure you have a `.env` file with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
```
`VITE_SUPABASE_*` are required for the app; `VITE_CLOUDINARY_*` are **required for image uploads** (the app is Cloudinary-only — uploads fail with a clear error until they're set).

## 🌐 Deployment

- **GitHub:** https://github.com/adamzzjd/ameb-ems-react
- **Vercel:** Auto-deploys from `main` branch
- **Required env vars:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Branch:** `main` (renamed from `master`)

### Auth system go-live (one-time)
1. **Database:** in the Supabase SQL Editor, run `supabase/setup_rls.sql` **after** `setup.sql` + `setup_ems.sql` — enables RLS with per-role policies and migrates legacy roles. Uncomment the super-admin promotion line at the bottom and set your email.
2. **Edge function:**
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
   supabase functions deploy manage-users
   ```
3. **Roles** are stored in each user's `app_metadata.role` (set via the User Management page or the dashboard).
