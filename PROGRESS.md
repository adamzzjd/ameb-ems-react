# 🏛 AMEB EMS — Migration Progress Report

> **From:** `ameb-ems/` (Vanilla JS)  
> **To:** `ameb-ems-react/` (React 19 + TypeScript 6 + Vite 8)  
> **Last updated:** September 30, 2026 (Phases 20–25 delivery platform · Phase 26 data-collection tool · Phase 27 canonical data links · **Phase 28 board & partner hierarchy** — departments, multi-org centres, assets & correspondence)

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

## 🚀 Phase 15: Promotions, Leave, Payroll, Documents Vault, Password Reset & Contact Alerts (Code Complete)

> ⚠️ **Superseded in part by Phase 18** — the payroll module and the `employees.basic_salary` column were later removed (pay is outside this system). Rows 15.1 and 15.2 below are historical.

> **One-time go-live:** run `supabase/setup_promotions.sql`, `setup_leaves.sql` and `setup_documents.sql` in the Supabase SQL Editor (creates the tables idempotently), then re-run `supabase/setup_rls.sql` for their policies. (`setup_payroll.sql` is gone — see Phase 18.) Deploy the `notify-contact` edge function + secrets (`supabase secrets set RESEND_API_KEY=...`; optional `NOTIFY_CONTACT_SENDER`).

| Step | Status | Notes |
|------|--------|-------|
| 15.1 Salary + step fields | ✅ Done → ❌ **Removed in Phase 18** | `employees.basic_salary` (number) + `employees.step` columns (idempotent ALTER in the since-deleted `setup_payroll.sql`). The **salary** field was removed in Phase 18; `employees.step` is kept as a grade-progression detail |
| 15.2 Payroll & Salary page | ✅ Done → ❌ **Removed in Phase 18** | `src/pages/Payroll.tsx` (month/year picker, per-officer sheet, totals, IPPS CSV via `src/lib/payroll.ts`, admin-only `payroll.manage`) — deleted along with the permission and the SQL schema |
| 15.3 Promotions & Progression page | ✅ Done | `src/lib/promotion.ts` (pure, tested): 3-year interval from present appointment, next-grade helper (GL NN → next level), due-soon/overdue/on-track flags; `src/pages/Promotion.tsx` — due/overdue summary, searchable list, promotion-history records (`promotion_records` table) with add/edit/delete |
| 15.4 Leave Management page | ✅ Done | `src/lib/leave.ts` (pure, tested): working-day math (weekends excluded), 12 days/year accrual capped at 36, per-type max-days validation, Monday-first month calendar, CSV exports (requests + balances); `src/pages/Leave.tsx` — request creation, approve/reject (new `leave.approve` permission), balances per officer |
| 15.5 Documents vault | ✅ Done | `src/pages/EmployeeProfile.tsx` — attach/download/delete employee documents (letters, certificates…) via `src/supabase/documents.ts` + `uploadDocumentToStorage` (Cloudinary-first); `DOCUMENT_CATEGORIES` taxonomy |
| 15.6 Password reset | ✅ Done | `src/pages/ResetPassword.tsx` — handles Supabase recovery links (`#/reset` hash): sets the session, collects the new password, updates via `updateUser`; App stays out of the app view until the reset finishes |
| 15.7 Contact-form email alerts | ✅ Done | `supabase/functions/notify-contact/index.ts` — edge function emails super_admin + admin users via Resend when the public contact form is submitted; `src/lib/notifyContact.ts` fire-and-forget caller; no-op (inbox still works) without `RESEND_API_KEY` |
| 15.8 Dashboard promotion alert | ✅ Done | Dashboard shows an overdue/due-soon promotion banner (count + Review button → Promotions page) using `getPromotionInfo` |
| 15.9 Tests | ✅ Done | 41 new tests (127 total at the time): `leave.test.ts` (working days, accrual, validation, calendar, CSV), `payroll.test.ts` (rows, naira formatting, IPPS CSV — suite **deleted in Phase 18**), `promotion.test.ts` (interval, next grade, due flags) |
| 15.9a Promotion test determinism | ✅ Done | `nextPromotionDate` test derived its expected date from "today" while the input used a fixed day-of-month — failed whenever today ≠ the 13th. Now computes the expectation from the appointment date itself (deterministic every day) |
| 15.10 Docs | ✅ Done | `.env.example` documents the `notify-contact` secrets (set on Supabase, not Vite) |
| 15.11 Stations in enrollment form | ✅ Done | Added **Women Development Centre Malamre** + **Technical College Yola** to the `STATIONS` constant so they appear in the employee enrollment form's station dropdown (ADSMEB HQ already present as "Yola (HQ)"). Note: the form dropdown is driven by the code list, while "Manage Stations" manages the separate `stations` DB table — add the same two names there via **+ Add Station** to keep the two lists in sync |

---

## 🚀 Phase 16: Employee Self-Service Portal (Code Complete)

> **One-time go-live:** run `supabase/setup_selfservice.sql` in the Supabase SQL Editor (adds `employees.address` + `employees.self_service_submitted_at`, creates `employee_registrations` + the four security-definer functions), then re-run `supabase/setup_rls.sql` (idempotent). **Re-run safe:** the script now DROPs each function before recreating it, so re-running it after a code update never hits PostgreSQL error 42P13 ("cannot change return type") — the first deployed `self_service_lookup` had a smaller return type and `create or replace` alone would refuse to upgrade it. This is also how the "Field dob cannot be updated" error was resolved: the live function was the pre-rework version that only allowed phone/LGA/address/photo, and re-running the updated script replaced it (live DB was one release behind).

**Model (per the board, August 13):** existing officers update ALL their fields (everything except PSN) — changes apply **DIRECTLY**, one-shot. New officers (PSN not in the register) self-register their full details → **PENDING** → admin approves (creates the record). The earlier `employee_update_requests` design is superseded (dropped by the script).

| Step | Status | Notes |
|------|--------|-------|
| 16.1 PSN lookup (anonymous) | ✅ Done | `public.self_service_lookup(psn)` SECURITY DEFINER — returns one officer's **full editable profile** (all fields except PSN) + `already_submitted` flag. No enumeration: anon can't read `employees` directly |
| 16.2 One-shot DIRECT update | ✅ Done | `public.submit_self_service_update(employee_id, changes)` — validates keys against ALL editable fields, applies the changes **immediately** to the employee row, stamps `self_service_submitted_at` (one-shot), writes an audit row |
| 16.3 Address field | ✅ Done | `employees.address` column (idempotent ALTER), employee form field, profile + print display, CSV import (`address`/`residential address` headers) + export |
| 16.4 Self-service portal | ✅ Done | `src/pages/SelfService.tsx` — enter PSN → existing officers edit **every field** (name, gender, grade, cadre, dates, phone, LGA, station, address, photo, step, remarks — salary removed in Phase 18) → review before→after → **Submit — Apply Now** → applied directly. One-shot: "already updated" + full read-only preview afterwards |
| 16.5 New-officer registration | ✅ Done | `public.check_employee_registration(psn)` (pending/rejected status) + `public.submit_employee_registration(psn, changes)` (validated PENDING insert, unique per PSN, audited). Portal shows: registration form → review → "submitted for approval"; re-entry shows "under review" or allows retry after rejection |
| 16.6 Admin approval queue | ✅ Done | `src/pages/Registrations.tsx` + `src/supabase/registrations.ts` — pending/approved/rejected tabs, submitted-details display, **Approve & Register** (creates the employee record) or **Reject** with a note; every decision audited. `selfservice.review` permission (super_admin + admin), route guard, sidebar entry + live pending badge (`usePendingRegistrations`) |
| 16.7 Entry point | ✅ Done | "Update your details with your PSN →" link on the Login page (no password needed) |
| 16.8 Tests | ✅ Done | 1 new CSV-address mapping test + role-matrix assertions (128 total); 16.12 adds 7 more CSV tests (135 total) |
| 16.9 Docs | ✅ Done | `setup_selfservice.sql` setup instructions; README schema note |
| 16.10 Register by PSN (admin) | ✅ Done | New admin page **Register by PSN** (`src/pages/PsnCheck.tsx`) — paste a list of staff numbers, see which are already in the register vs new, enter names and register the new ones as minimal employee records (audited create). Sidebar under Overview, `employees.import` permission + route guard |
| 16.11 Header PSN entry | ✅ Done | The public site header now has a visible **Staff PSN** input (desktop nav + mobile menu) — typing a PSN jumps straight into the self-service portal with it prefilled |
| 16.12 PSN-safe CSV import | ✅ Done | **Import from Register** now skips rows whose **PSN is already on file — untouched, never overwritten** (in addition to name-dedup), dedupes repeated PSNs inside the sheet, normalizes grades to the system's `GL xx` format (`07` → `GL 07`), matches cadres to the register list (unambiguous only; unmatched kept as typed + reported), and shows an up-front plan: N to import · skipped counts (existing name / existing PSN / dup-in-sheet / empty name) + unmatched cadre values. `normalizeGrade`/`findCadreMatch`/`buildImportPlan` in `src/lib/csv.ts` (pure, tested) |
| 16.13 Self-service rework | ✅ Done | (a) **Photo bug fixed** — the portal uploaded photos but never sent them on submit (`buildChanges` iterated `FIELDS`, which excludes `photo`); the photo URL is now in the payload + review diff (with thumbnails) + "already submitted" preview. (b) **Self-registration CLOSED** — a PSN not in the register now gets a friendly "contact the Board Office" message; the `employee_registrations` queue, its functions and the whole admin **New Officer Registrations** page/sidebar/badge were removed (new staff come in via CSV import or PSN Tools). (c) **Admin unlock tool** — new `reset_self_service_lock(psn)` SECURITY DEFINER function (admin+ only, audited) + an **Unlock Officer** card on the PSN Tools page (sidebar entry renamed **PSN Tools**) to clear the one-shot lockout for testing/corrections |
| 16.14 Security audit + env guard | ✅ Done | Full top-to-bottom security review (RLS, SECURITY DEFINER fns, storage, edge fns, XSS, deps). Fixed: (a) **Vercel env guard** — `vite.config.ts` now fails the build loudly on Vercel if any required `VITE_` var (Supabase + Cloudinary) is missing (local/CI only warn), preventing silent broken-upload deploys; (b) **nanoid vuln** (`npm audit fix` → 0 vulnerabilities). Findings awaiting decision: anon self-service functions allow updating any record by uuid (no PSN binding — the salary-exposure half of this was retired in Phase 18 when the salary field was removed); any signed-in user can read all employees/documents via API (permission checks are UI-only); contact form has no spam protection; CMS headings render admin HTML unsanitized; missing security headers |

### PSN not in the database
Self-registration is **closed** — a lookup miss shows a "contact the Board Office" message. New staff are registered by the board office only: via **Import from Register** (CSV, 16.12) or the admin **PSN Tools** page (16.10).

---

## 🚀 Phase 17: LGA Area Officers Register (Code Complete)

> **One-time go-live:** run `supabase/setup_lga_officers.sql` in the Supabase SQL Editor (creates `lga_area_officers` — one row per LGA, `employee_id` FK → `employees`), then re-run `supabase/setup_rls.sql` so the table gets its policies (idempotent, safe to re-run).

**Model:** each of the 21 LGAs has **one** area officer, and the officer is always a staff member from the `employees` register — never a free-text name. Rows are keyed by a UNIQUE `lga`, so assigning again simply replaces the sitting officer; deleting the staff record clears the assignment (`on delete set null`) instead of dropping the LGA row. Managed by admins only (`settings.manage`), the same access model as stations/cadres/centres.

| Step | Status | Notes |
|------|--------|-------|
| 17.1 DB table | ✅ Done | `supabase/setup_lga_officers.sql` — `lga_area_officers` (`lga` UNIQUE, `employee_id` FK → employees `on delete set null` + **UNIQUE** index, `remarks`, timestamps). One officer per LGA **and one LGA per officer** — the unique index on `employee_id` is nullable, so LGAs can still sit without an officer |
| 17.2 RLS policies | ✅ Done | `setup_rls.sql` — new guarded block: any signed-in user reads, admin+ writes (same model as stations/cadres/facilitators) |
| 17.3 Types + Supabase service | ✅ Done | `LgaAreaOfficer` type + `'lga-officers'` in `AppPage`; `src/supabase/lgaOfficers.ts` — `dbLoadLgaAreaOfficers` / `dbSetLgaAreaOfficer` (upsert on `lga`) / `dbRemoveLgaAreaOfficer`, all writes audited |
| 17.4 Register page | ✅ Done | `src/pages/LgaOfficersManager.tsx` — lists **all 21 LGAs** (assigned or not) with search + assigned/unassigned filter, coverage stat cards, a searchable staff-register picker, assign / change / unassign, and print. A staff member who already covers another LGA is greyed out and unselectable (🚫), and the save is refused even if one is selected another way — unassign first, then assign to the new LGA |
| 17.5 Routing + navigation | ✅ Done | `lga-officers` page in `App.tsx` (lazy, `settings.manage` guard + prop), Sidebar entry next to Learning Centres, `PAGE_TITLES` entry |
| 17.6 Profile + dashboard surfacing | ✅ Done | Area-officer badge + field on the employee profile (read live from the register) and an LGA coverage panel with per-LGA officer chips on the Dashboard (admin-only **Manage** link). Printed profile matches the screen via a new optional `printEmployeeProfile(employee, officerLgas)` argument |
| 17.7 Print + backup | ✅ Done | `printLgaAreaOfficers()` register print (all LGAs with assignment status); `lga_area_officers` added to the JSON backup table list |
| 17.8 Tests + docs | ✅ Done | 4 new service tests in `registerServices.test.ts` (139 total at the time; 131 after Phase 18); README setup order + schema row, `supabase/verify_rls.sql`, `DEPLOYMENT.md` and the docs set updated |
| 17.9 Reconciliation pass | ✅ Done | Audited every registry the facilitators feature touches: fixed `verify_rls.sql` (never checked the new table), README setup order + schema row, `DEPLOYMENT.md` script order, the whole `docs/` set, stale test counts (86/135 → 139 at the time), and a register bug where a stored LGA outside the statutory 21 was invisible. New shared `mergeLgas()` in `src/data/constants.ts` (also used by the dashboard panel and the public LGA dropdown) keeps every list view on the same LGA set |
| 17.10 One LGA per officer | ✅ Done | Blocked (was a warning): unique index on `lga_area_officers.employee_id`, greyed-out/unselectable candidates in the picker with the reason, a blocking error + disabled **Save** in the dialog, a re-check inside `handleSave`, and a plain-English message if the database still rejects a race-condition duplicate. Docs (README, 04, 06) updated to match |

---

## 🚀 Phase 18: Payroll & Salary Removed (Code Complete)

> **One-time go-live (existing databases):** run `supabase/remove_payroll.sql` in the Supabase SQL Editor — it drops `payroll_runs`, `payroll_lines` and `employees.basic_salary` (⚠ the salary figures are gone permanently — export a backup first if you want them). Then re-run `supabase/setup_selfservice.sql`, because the portal's `self_service_lookup` function has to stop returning a column that no longer exists.

**Why:** the Board does **not** pay salaries from this system — pay is handled by government processes — so the platform carried a feature it was never meant to own. The register keeps `employees.step` as a grade-progression detail; **no money amount is stored, entered, imported, exported or printed anywhere**.

| Step | Status | Notes |
|------|--------|-------|
| 18.1 Module deleted | ✅ Done | Removed `src/pages/Payroll.tsx`, `src/lib/payroll.ts` (+ its test file), `src/supabase/payroll.ts` and `supabase/setup_payroll.sql` |
| 18.2 Navigation + permissions | ✅ Done | Route, sidebar item (**Payroll & Salary**), `PAGE_TITLES` entry, route guard and the `payroll.manage` permission all removed; `'payroll'` dropped from `AppPage` and the audit-action union |
| 18.3 Salary field removed | ✅ Done | `employees.basic_salary` gone from the type, the create/update payload, the employee form (field 11 removed, later fields renumbered), CSV import aliases and CSV export column, and the self-service portal (field + review diff + typed-value handling) |
| 18.4 Print | ✅ Done | `printPayrollSheet` deleted along with its `fmtNaira`/`PayrollRow` imports. No printout has ever carried a money column |
| 18.5 Database cleanup | ✅ Done | New `supabase/remove_payroll.sql` (drops both tables + the column, with verification queries); `setup_selfservice.sql` no longer lists or validates `basic_salary` in `self_service_lookup` / `submit_self_service_update` |
| 18.6 Security dividend | ✅ Done | Retires security **Finding #3**: the anonymous PSN lookup can no longer disclose pay figures, which was flagged HIGH in the assessment. Finding #4 is narrowed to the staff register + documents |
| 18.7 Tests + docs | ✅ Done | `payroll.test.ts` removed (**131 tests / 14 files**); the CSV suite gains a test asserting a Salary column is ignored. Rebuilt the QA inventory with accurate per-file counts, refreshed the database dictionary, requirements, admin/user manuals, security assessment, roadmap and deployment checklists |

---

## 🚀 Phase 19: Partner Organisations & Centre Ownership (Code Complete)

> **One-time go-live:** run `supabase/setup_partners.sql` in the Supabase SQL Editor, then re-run `supabase/setup_rls.sql` (adds the new tables' policies and **tightens the staff register**). No edge-function redeploy is required for existing users, but `manage-users` must be redeployed to provision partner accounts.

**Why:** NGOs, LGAs and CSOs run learning centres, but the platform had no way to say *who owns a centre* and no way to let a partner manage their own delivery without seeing the board's entire staff register. Phase 19 introduces the tenant model (`partner_organisations` + `organisation_members`), centre ownership, and an approval queue so partner-created centres can't appear publicly unvetted.

| Step | Status | Notes |
|------|--------|-------|
| 19.1 DB tables | ✅ Done | `supabase/setup_partners.sql` — `partner_organisations` (name, type, contact, MOU ref, agreement dates, status) + `organisation_members` (user ↔ organisation, `org_role`, unique per pair, indexed). RLS enabled immediately (deny-all until policies arrive). |
| 19.2 Centre ownership | ✅ Done | Idempotent ALTERs add `owner_type`, `partner_org_id`, `centre_code` (unique partial index), `funding_source`, agreement dates and the approval columns. Existing centres default to `ADSMEB` + `approved`, so **nothing already public disappears**. |
| 19.3 RLS helpers | ✅ Done | `auth_org_ids()`, `has_org_access(org)`, `is_adsmeb_staff()`, `can_view_staff_register()` — following the existing `auth_role()` pattern. `auth_org_ids()` is SECURITY DEFINER so the membership lookup isn't blocked by its own policies. |
| 19.4 Approval guard | ✅ Done | `enforce_centres_approval` trigger forces any non-board write back to `pending` and clears the approval fields — a partner can never self-approve, and editing an approved centre returns it to the queue. |
| 19.5 Staff-register lockdown | ✅ Done | ⚠️ `employees_select` was "any signed-in user". Now that external partner accounts exist, it is restricted to `can_view_staff_register()` (board roles only) — **this was a real data leak** once partners could sign in. |
| 19.6 Tenant-scoped centres | ✅ Done | `centres_select` = board staff **or** the caller's own organisation; partners may insert/update their own centres only (RLS), with the trigger enforcing review. |
| 19.7 Public directory gate | ✅ Done | `public_centres` re-created to expose `owner_type`, `centre_code` and partner name, and to show **only** `approval_status = 'approved'` centres. |
| 19.8 Roles & permissions | ✅ Done | `src/lib/roles.ts` gains `meb_officer`, `lga_officer`, `enumerator`, `partner_admin`, `partner_editor`, `partner_viewer`, `mne_viewer`; new permissions `centres.manage`, `programmes.manage`, `learners.manage`, `enrolments.manage`, `forms.submit`, `reports.view`, `approvals.review`, `partners.manage`; `isPartnerRole()` helper. Existing roles keep their old capabilities. |
| 19.9 Service layer | ✅ Done | `src/supabase/partners.ts` — `dbLoadPartnerOrganisations`, `dbSavePartnerOrganisation`, `dbDeletePartnerOrganisation`, `dbLoadOrganisationMembers`, `dbLoadPendingCentres`, `dbSetCentreApproval`; every write audited (`approve`/`reject` added to the audit-action union, plus an optional `organisation_id` on audit rows). |
| 19.10 Partner registry page | ✅ Done | `src/pages/PartnerOrganisations.tsx` — summary cards, search, register/edit dialog, delete confirm, member list, and an inline **centre approval queue** (approve, or reject with a reason). Super-admin only; wired into `App.tsx` (lazy + `partners.manage` guard), the Sidebar Settings section, and `PAGE_TITLES`. |
| 19.11 User provisioning | ✅ Done | `manage-users` edge function gains the new role list, `organisation_id` + `org_role` on create (rolling the account back if the membership write fails), a `setOrg` action, tenant info on `list`, and membership cleanup on delete. `UserManagement` shows an Organisation column and a partner-org picker when a partner role is selected. |
| 19.12 Backup | ✅ Done | `partner_organisations` + `organisation_members` added to the JSON backup table list. |
| 19.13 Tests | ✅ Done | 8 new service tests in `registerServices.test.ts` (**139 total / 14 files**): org CRUD call shapes + defaults, audit on success / no audit on failure, membership read, approve with approver stamp, reject with reason. |

### Not yet done (next phases)
Partner-scoped learner CSV import, per-cohort attendance/registers, certificate generation, and notification digests remain candidates for future phases (see the delivery pages' current limitations).

---

## 🚀 Phase 20: Real Public Routes (Code Complete)

> **No database changes.** Pure front-end routing: `react-router` (already a dependency) is now mounted and the public website serves real URLs — `/programs`, `/programs/<slug>`, `/centres`, `/news`, `/news/<slug>` — alongside the state-driven portal at `/portal/<page>`. Deep links survive hard refreshes on Vercel via the updated SPA rewrite.

**Why:** programme/news links were in-page state changes, so they couldn't be shared, bookmarked, or refreshed; the centre directory and news only existed as Landing-page sections. Phase 20 turns each into its own page with a stable URL (derived from the title via `slugify`, with the raw row id also accepted so old/external links keep working).

| Step | Status | Notes |
|------|--------|-------|
| 20.1 Router mounted | ✅ Done | `BrowserRouter` + `ScrollManager` in `main.tsx`. `App.tsx` derives its view from `location.pathname`: public pages, `/login`, `/self-service?psn=…`, and `/portal/<page>` (replaces the old `view`/`currentPage` state). Signed-in users hitting `/` or `/login` are redirected to `/portal`; unauthenticated visitors to `/portal/*` go to `/login`. |
| 20.2 URL helpers | ✅ Done | `src/lib/slug.ts` — `slugify()`, a `paths` map (single source of truth for public URLs) and `findBySlug()` (slug match with raw-id fallback). 8 new unit tests (147 total). |
| 20.3 Public shell | ✅ Done | `src/components/layout/PublicShell.tsx` — govt bar + sticky header (CMS logo, active-link nav) + footer used by every public sub-page; `PublicPageHeader` banner and `RichText` (plain-text safe renderer — **no** `dangerouslySetInnerHTML`, closing the CMS-heading XSS finding on these pages). |
| 20.4 Programmes pages | ✅ Done | `/programs` catalogue + `/programs/<slug>` detail (replaces the in-page detail view). Unknown slug → friendly not-found with a link back. Cards on the Landing page now link out via `paths.program(slugify(title))`. |
| 20.5 News pages | ✅ Done | `/news` listing + `/news/<slug>` article (replaces the in-page article view); card titles and "Read more" are real links now. |
| 20.6 Centre directory | ✅ Done | `/centres` standalone directory — search, LGA filter chips, capacity/contact/facilitator/partner chips, results count — reading the same public `public_centres` view (approved centres only). Landing CTAs point here. |
| 20.7 Landing slimmed | ✅ Done | `DetailShell`/`ProgramDetailPage`/`NewsArticlePage`/`renderDetails` removed (~370 lines); landing keeps its richer single-page header. |
| 20.8 Portal routing | ✅ Done | Sidebar navigation pushes `/portal/<page>` (back/forward work inside the portal); route guards unchanged; `NotFound` "go home" now navigates to `/portal`. Password-reset flow navigates by URL. |
| 20.9 Vercel deep links | ✅ Done | `vercel.json` rewrites everything except `assets/` to the SPA (assets keep 404ing properly instead of returning HTML). |
| 20.10 E2E coverage | ✅ Done | New `e2e/public-routes.spec.ts` (5 tests): catalogue render, slug deep link, unknown-slug empty state, news link shape (skips on empty DB), centres search + LGA filter, and hard-refresh deep-link survival. |

---

## 🚀 Phases 21–25: Partner Portal, Programmes & Cohorts, Learner Register, Reports & M&E (Code Complete)

> **One-time go-live:** run `supabase/setup_delivery.sql` in the Supabase SQL Editor (creates `programmes`, `cohorts`, `learners` + the `cohort_overview` view, idempotent) — it must run **after** `setup_ems.sql` and `setup_partners.sql` (FK prerequisites; the script now preflights and says so explicitly) — then re-run `supabase/setup_rls.sql` (adds the §4.7 owner_org-scoped policies). No edge-function changes. Skipping the script shows up in the app as PostgREST's "Could not find the table 'public.programmes' in the schema cache".

**Why:** Phase 19 introduced partner tenants but had no portal for them and no way to track *delivery* — what is taught, where, to whom, with what outcomes. Phases 21–25 close that gap with the partner portal home, the programme → cohort → learner data model, and a cross-cutting M&E dashboard. Learners are **not** staff: the learner register is separate from the employees register, and no salary/money fields exist anywhere (pay stays outside this system).

| Step | Status | Notes |
|------|--------|-------|
| 21.1 Delivery schema | ✅ Done | `supabase/setup_delivery.sql` — `programmes` (title, category, duration, status), `cohorts` (programme × centre, dates, capacity), `learners` (reference no UNIQUE-partial, age group, cohort FK, status), all with nullable `owner_org_id` (null = board-owned) + the `cohort_overview` view (cohort + programme + centre + learner count). RLS enabled immediately on all three. |
| 21.2 Delivery RLS | ✅ Done | `setup_rls.sql` §4.7 (guarded block): board roles see everything (`can_view_staff_register`), enumerators get learner write, `mne_viewer`/`partner_viewer` read-only; partner users are scoped to `owner_org_id in auth_org_ids()` — same tenant model as centres. |
| 21.3 Types + services | ✅ Done | `Programme`/`Cohort`/`CohortOverviewRow`/`Learner` types; `src/supabase/delivery.ts` — load/save/delete for all three, `ownerOrgId` stamping, `completed_on` auto-stamp, every write audited (11 new service tests, mocked Supabase). |
| 21.4 Programmes page | ✅ Done | `src/pages/ProgrammesManager.tsx` — summary cards, search, add/edit/delete dialogs, status chips. `programmes.manage` gates writes; read-only viewers see the catalogue. |
| 21.5 Cohorts page | ✅ Done | `src/pages/CohortsManager.tsx` — cohort × programme × centre table (from `cohort_overview`), learner/capacity counts, add/edit/delete. Writes gated on `programmes.manage` or `learners.manage`. |
| 21.6 Learner register | ✅ Done | `src/pages/LearnersPage.tsx` — stats, search, status/cohort filters, enrol/edit/remove dialogs, CSV export with joined cohort/programme/centre columns (`src/lib/learnerCsv.ts`, pure + tested: escaping, validation, header aliases). `learners.manage` gates writes. |
| 21.7 Reports & M&E | ✅ Done | `src/pages/ReportsPage.tsx` — headline cards, learner outcomes (active/completed/dropped/transferred with %), gender split, learners-by-LGA and learners-by-programme bars, cohort fill-rate table. Degrades gracefully when `setup_delivery.sql` hasn't run. `reports.view`. |
| 21.8 Partner portal home | ✅ Done | `src/pages/PartnerPortal.tsx` — the partner's org card (type, contact, own role, suspended warning), delivery summary, own centres with approval chips, recent cohorts. Everything RLS-scoped; friendly empty state when the account has no organisation yet. Reachable at `/portal/partner-home`. |
| 21.9 Navigation | ✅ Done | New sidebar **Programme Delivery** section (Programmes, Cohorts, Learner Register, Learning Centres, Reports & M&E) permission-gated so partner roles and viewers see exactly their slice; Learning Centres moved out of "Browse By"; 5 new `AppPage` values + `PAGE_TITLES` entries; route guards in `App.tsx`. |
| 21.10 Backup + verify | ✅ Done | `programmes`/`cohorts`/`learners` added to the JSON backup; `verify_rls.sql` checks the three new tables. |
| 21.11 Tests | ✅ Done | **168 unit tests / 17 files** (21 new: 11 delivery services + 10 learner CSV). Typecheck, lint (0 errors), build, and all 8 public e2e tests pass. |

---

## 🚀 Phase 26: Data Collection Tool — Forms, Assignments & Field Submissions (Code Complete)

> **One-time go-live:** run `supabase/setup_forms.sql` in the SQL Editor (creates `form_templates`, `form_assignments`, `form_submissions` — preflighted, must run after `setup_ems.sql`, `setup_partners.sql` and `setup_delivery.sql`), then re-run `supabase/setup_rls.sql` (adds the §4.9 policies). No edge-function changes.

**Why:** the `enumerator` role and `forms.submit` permission have existed since Phase 19/21, but there is nothing for them to submit — the only field-capture surface today is the Learner Register. The board needs to design its own forms (surveys, attendance tallies, facility checks), push them to enumerators/partners, and have the answers flow into M&E without hand-copying.

**Model:** the board **designs** a form (`form_templates` — typed fields as JSONB, versioned, activatable) and **assigns** it (`form_assignments` — to a user, an organisation, or open to all enumerators, optionally scoped to a centre/cohort with a due date). Field staff **fill and submit** (`form_submissions` — answers JSONB, draft → submitted → approved/rejected with reviewer note). Everything carries `owner_org_id` and is audited, same tenant model as the delivery tables.

| Step | Status | Notes |
|------|--------|-------|
| 26.1 DB schema | ✅ Done | `supabase/setup_forms.sql` — `form_templates` (title, description, status `draft\|active\|retired`, version, `fields` jsonb array, owner_org_id), `form_assignments` (template FK cascade, `assigned_to` null = open to all enumerators, centre/cohort FKs, due_date, status), `form_submissions` (answers jsonb, status `draft\|submitted\|approved\|rejected`, submitted/reviewed stamps, centre/cohort, owner_org_id). Preflight guard per the Phase 21 pattern; RLS enabled immediately; photo fields deferred (Cloudinary upload inside forms = later phase). |
| 26.2 RLS | ✅ Done | `setup_rls.sql` §4.9: templates — signed-in read, board writes; assignments — field staff see `assigned_to = auth.uid()` **or** open rows, board sees all; submissions — field roles insert draft/submitted only, field update locked to own rows and blocked from touching approved ones (`status in ('draft','submitted','rejected')`), separate review policy for super_admin/admin/meb_officer/mne_viewer, partner scoping via `auth_org_ids()` throughout. |
| 26.3 Types + pure helpers | ✅ Done | `FormField`/`FormTemplate`/`FormAssignment`/`FormSubmission` types; `src/lib/forms.ts` (pure): `generateFieldKey` (slug + collision suffix), `validateAnswers` (required, number min/max, select/multi option membership), `normalizeAnswers` (trims, coerces numbers/booleans, drops unknown keys), `answersToCsvRows`/`csvFromRows` (per-template CSV), `promoteToLearner` (alias mapping name/sex/village etc. → `Learner`; null when no name). |
| 26.4 Services | ✅ Done | `src/supabase/forms.ts` — template/assignment/submission CRUD, `dbReviewSubmission` (approve/reject with reviewer stamp), session-attributed `submitted_by`, owner stamping + audited writes exactly like `delivery.ts` (audit only on success). |
| 26.5–26.6 Form builder + assignments (board) | ✅ Done | `src/pages/FormBuilder.tsx` — summary cards, search, template cards with status chips, editor dialog (add/remove/reorder questions, 7 field types, select/multi options one-per-line, required flag), activate/retire toggle, assign dialog (optional centre/cohort scope + due date; open-to-all-enumerators model), assignments table with revoke. Gated `forms.manage`. |
| 26.7 Field capture (enumerator) | ✅ Done | `src/pages/MyAssignments.tsx` — mobile-first (42px touch targets): open assignments with overdue flags, fill dialog with type-appropriate inputs (checkbox multi-select, big selects), inline validation errors, Save Draft / Submit, "My submissions" table with status chips + reviewer notes, draft/rejected editable + deletable. Gated `forms.submit`. |
| 26.8 Review queue (board) | ✅ Done | `src/pages/SubmissionsReview.tsx` — status chips (submitted default) + template + free-text search across answers, full answer display, approve/reject dialog (note required on reject), **Promote to learner** on approved enrolment forms (via the audited `dbSaveLearner`), per-template CSV export (BOM-prefixed). Gated `reports.view`. |
| 26.9 Reports integration | ✅ Done | `ReportsPage` "Field Data" card: total / approved / awaiting review / rejected counts. Degrades to hidden when `setup_forms.sql` hasn't run. Approved-only counting per Decision B. |
| 26.10 Tests + docs | ✅ Done | `src/lib/__tests__/forms.test.ts` (19 tests: keys, validation, normalization, CSV, promotion) + `src/supabase/__tests__/forms.test.ts` (12 tests: payload shapes, owner stamping, draft vs submitted stamps, reviewer stamps, audit on success only) — **199 unit tests / 19 files**. README setup order (step 11), `verify_rls.sql` gains the three tables, backup now includes them. |
| 26.11 Navigation | ✅ Done | New sidebar **Data Collection** section: Form Builder (`forms.manage`), My Assignments (`forms.submit`), Submissions Review (`reports.view`); `forms.manage` permission added to super_admin/admin/meb_officer; 3 new `AppPage` values + `PAGE_TITLES`; route guards in `App.tsx`. |

### ✅ Decisions (signed off Sept 28, 2026)
- **A. Enumerator visibility — own submissions only.** Each enumerator sees strictly their own drafts/submissions; board reviewers see everything. Simplifies RLS and protects sensitive survey answers.
- **B. M&E counts approved submissions only.** The review queue is the data-quality gate, mirroring the centre-approval pattern from Phase 19.
- **C. Online-only in Phase 26.** Field capture requires a network connection; offline outbox (IndexedDB + sync-on-reconnect) deferred to a future phase.

---

## 🚀 Phase 27: Canonical Data Links (Code Complete)

> **One-time go-live:** run `supabase/setup_canonical_links.sql` **after** `setup_ems.sql`, `setup_partners.sql` and `setup_delivery.sql`, then re-run `setup_rls.sql` (§4.10 policies for `lgas`). Idempotent — re-run after fixing any unmatched values it reports.

**Why:** several register fields only *looked* like relationships but were free text — the same 21 LGAs retyped in 5+ tables (typos silently split M&E numbers), an `employees.station` text field duplicating the `stations` register, and `centres.ngo_partner` free text duplicating Phase 19's `partner_org_id`. Phase 27 turns each into a real foreign-key relationship while keeping the app reading plain text (CSV import/export, print and the self-service functions are untouched).

**Model:**
- `lgas` reference table (the statutory 21, seeded) — `employees.lga`, `centres.lga`, `facilitators.lga`, `learners.lga`, `partner_organisations.lga` all gain FKs to `lgas(name)` with `ON UPDATE CASCADE`. NULL stays legal (unknown origin is real life); a wrong LGA is now impossible. Existing values were canonicalized case-insensitively before the FKs landed.
- `employees.station_id` FK → `stations`, with two sync triggers: writing station *text* (CSV import, self-service) resolves it to the register row, and picking a station row normalizes the text; renaming a station propagates to every officer posted there. The employee form's dropdown now loads the **live** stations register (hardcoded list only as offline fallback).
- `centres.ngo_partner` **dropped** — values migrated onto `partner_org_id` where the name matched, `public_centres` re-created to resolve the partner name via the join. Single source of truth: the partner register.

| Step | Status | Notes |
|------|--------|-------|
| 27.1 lgas reference table | ✅ Done | `setup_canonical_links.sql` §1 — seed of the 21 statutory LGAs (`on conflict do nothing`), guarded FK creation, RLS enabled (§4.10: public/anon read, admin+ write — reference data, not user content). |
| 27.2 Canonicalization + 5 FKs | ✅ Done | §1a updates existing rows case-insensitively, then adds `employees_lga_fk`, `centres_lga_fk`, `facilitators_lga_fk`, `learners_lga_fk`, `partner_organisations_lga_fk` — all `on update cascade`, all guarded for re-runnability. |
| 27.3 Station link | ✅ Done | §2 — `employees.station_id` + index, stations seeded from the canonical list when empty, backfill from legacy text, `sync_employee_station` trigger (text↔id resolution both directions) and `sync_station_rename` trigger (register rename propagates). Employee form dropdown now reads the live register (`App.tsx` loader, fallback to the constant list). |
| 27.4 ngo_partner killed | ✅ Done | §3 — text migrated to `partner_org_id`, column dropped, `public_centres` re-created (drop-first, anon-readable) resolving `partner_name` via `partner_organisations`. All source scripts cleaned so no code path references the dead column again: `setup_ems.sql` (no longer creates it on fresh installs), `setup_enrolments.sql` (legacy view branch), `setup_partners.sql` (both view branches). §5 of the script prints the checklist queries for unmatched values. |
| 27.5 App updates | ✅ Done | `CentresManager` — free-text NGO Partner field replaced by a **Partner Organisation** select (board-run option = null), stats/search/table/print/view dialog all via `partnerName()`; `centres.ts` service writes `partner_org_id`; `Centre`/`PublicCentre` types lose `ngo_partner`; `src/lib/csv.ts` gains `canonicalizeLga()` (case/whitespace-insensitive → the 21, else null) wired into `mapRowToEmployee`. |
| 27.6 Tests + docs | ✅ Done | 3 new `canonicalizeLga` tests (**202 unit tests / 19 files**); README setup order gains step 12; `verify_rls.sql` includes `lgas`; backup includes `lgas`. Typecheck clean, lint 0 errors (23 pre-existing warnings), build passes. |

---

## 🚀 Phase 28: Board & Partner Hierarchy (28.1 Code Complete)

> **One-time go-live (strict order):** ① Phase 26 + 27 scripts, ② `setup_rls.sql`, ③ `supabase/setup_hierarchy.sql` (§4.11 policies), ④ re-run `setup_rls.sql`, ⑤ `NOTIFY pgrst, 'reload schema';`. **28.1 migrates off `centres.partner_org_id` — running it before the app reaches Phase 28 makes centre→org edits fail (see below).**

**Why:** the platform covered the staff register and a flat partner list; the Board's own structure (departments, board-run programmes, assets, correspondence) was unmodellable, and a centre could belong to only one organisation. Phase 28 implements the signed-off "total but not total separation": the Board and partner worlds keep separate trees but meet at the centre.

**Model:**
- **Board side:** `departments` (units of the Board) with `employees.department_id`; **board programmes** are simply `programmes.owner_org_id = null`; `board_assets` (tag/name/category/quantity/condition — no money values, per board rule) located at a station, department or centre with a custodian; `correspondence` (ref_no/title/kind/direction/parties + optional file) filed per department.
- **Partner side:** `organisation_lga_coverage` (the LGAs an org works in, backfilled from each org's HQ LGA); `programme_lgas` (a programme's LGA scope); `centre_organisations` many-to-many — a centre hosts one **lead** org plus any number of partner/funder/host orgs, enforced by a partial unique index.
- **The meeting point:** `centres.owner_type` still says who runs the place; `centre_organisations` says who is involved. Partner users keep seeing only their own slice (every join policy checks `org_id in auth_org_ids()`).
- **`public_centres`** re-created: `partner_name` = the lead org's name; new `partner_orgs` array exposes the non-lead orgs.

| Step | Status | Notes |
|------|--------|-------|
| 28.1 Schema + RLS | ✅ Done | `setup_hierarchy.sql` — preflighted, idempotent; migrates existing `partner_org_id` values into `role='lead'` rows then drops the column (Phase 27 playbook); re-creates `public_centres` drop-first with both branches guarded for missing facilitator tables. `setup_rls.sql` §4.11 — departments follow the employees model; the three joins follow the `owner_org_id` tenant model; assets/correspondence follow the `employee_documents` model. `verify_rls.sql` §1/§2 list the six new tables; backup includes them. README setup order gains step 13. ⚠️ **App follow-up (28.5):** `src/supabase/centres.ts` + `CentresManager` still write `partner_org_id` until the multi-org UI lands — go live with this script only together with the Phase 28 app code. |
| 28.2 Explore navigator + sidebar regroup | ✅ Done | `src/lib/explore.ts` — pure tree builder (Board branch: departments→staff + board programmes→LGAs→centres→cohorts→learners; org branches: coverage, own programmes, involved centres incl. partner-on-co-run centres) with **10 unit tests** (`explore.test.ts`, now **212 tests / 20 files**). `src/supabase/hierarchy.ts` — read loaders for the six Phase 28 tables + delivery registers, every one degrading to empty when `setup_hierarchy.sql` hasn't run; `hierarchyReady` flag drives an on-page setup hint. `src/pages/Explore.tsx` — drill-down navigator with breadcrumb trail (Board ▸ org ▸ programme ▸ LGA ▸ centre ▸ cohort ▸ learners), cross-chips linking co-run centres back to each involved org, deep links out to the registers (centres/learners/employees/partner portal). Sidebar regrouped **Board** (staff register + all staff views) vs **Partners** (organisations, portal, programmes, cohorts, learners, centres, facilitators, M&E) with new **Explore** entry under Overview; `AppPage` + `PAGE_TITLES` gain `explore`. |
| 28.3 Departments + staff assignment | ✅ Done | `src/supabase/departments.ts` — CRUD with audit stamps, 5 service tests (**217 tests / 21 files**). `src/pages/Departments.tsx` — StationsManager-style manager (name/code/head/status/description, per-dept staff counts linking to the register, duplicate-name guard, delete warns staff survive as "No department assigned", on-page hint while `setup_hierarchy.sql` hasn't run; gated `settings.manage`, route + guard + PAGE_TITLES + sidebar entry under **Board**). `Employee.department_id` flows through `dbSave`; EmployeeForm gains a **Department** select (disabled with a setup hint until departments exist). Explore's board branch now fills with real data once departments are created. |
| 28.4 Programme ownership + LGA scope | ✅ Done | ProgrammesManager upgraded: **Owner** toggle — The Board (owner_org_id null) or a partner organisation (select from the live register) — with a Board/Partner summary row and an owner filter on the toolbar; **LGA scope** picker (21 LGAs as toggle chips) writing through `dbSetProgrammeLgaScope` (upsert wanted rows + prune the rest via `.not('lga','in',…)`; empty set clears; audited as `assign`); scope chips render on cards. Graceful: when `programme_lgas` doesn't exist yet the picker hides with a setup hint and saving proceeds scope-less; **4 new service tests** (upsert+prune, clear, empty-filtering, error path — **221 tests / 21 files**). Explore's programme drill-down now reflects the scope once set. |

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

### Unit tests (14 files, 139 tests)
- `src/lib/__tests__/utils.test.ts` — cn() utility tests
- `src/lib/__tests__/roles.test.ts` — Role/permission matrix tests
- `src/lib/__tests__/retirement.test.ts` — Retirement & tenure math (age 60 / 35 years of service)
- `src/lib/__tests__/dataQuality.test.ts` — Completeness stats, missing fields, duplicate names
- `src/pages/__tests__/CsvImport.test.ts` — CSV import helpers (mapping, PSN-safe dedup, grade normalization, cadre matching)
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
npm test          # Run 199 unit tests
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
