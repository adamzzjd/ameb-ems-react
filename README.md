# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## 🔧 Supabase Setup

The app reads and writes directly to Supabase using the anon key. Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Then create the tables by running the SQL setup scripts in the **Supabase dashboard → SQL Editor → New query** (paste and click Run):

1. [`supabase/setup.sql`](./supabase/setup.sql) — **CMS tables** (required for the public website + CMS admin)
2. [`supabase/setup_ems.sql`](./supabase/setup_ems.sql) — **EMS register tables** (employees, stations, cadres, centres)
3. [`supabase/setup_storage.sql`](./supabase/setup_storage.sql) — **image URL columns** (adds the image columns to the CMS tables — images themselves live on Cloudinary, see below)
4. [`supabase/setup_facilitators.sql`](./supabase/setup_facilitators.sql) — **facilitator registry** (`facilitators` + `centre_facilitators` join). Migrates the old `centres.facilitator` free-text values into the registry and links them, then drops the legacy column.
5. [`supabase/setup_enrolments.sql`](./supabase/setup_enrolments.sql) — **enrolment statistics** (`enrolment_stats` per-year table + the `public_centres` view that powers the public centre directory)
6. [`supabase/setup_audit.sql`](./supabase/setup_audit.sql) — **audit log** (`audit_log` append-only table — who did what, when; readable by super_admin only)
7. [`supabase/setup_rls.sql`](./supabase/setup_rls.sql) — **Row Level Security** — run **last**, after all the setup scripts above, so the new tables get their policies.

All scripts are idempotent (safe to re-run).

> **Upgrading an existing database to the AMEB cadre list:** re-run `supabase/setup_ems.sql` (adds the `cadres.grade` column), then in the app open **Manage Cadres → ↺ Restore Defaults** to replace any old cadre rows with the standard AMEB establishment list and their grade levels.

### 🖼 How image uploads work (Cloudinary-only)

All images are uploaded to and served from **Cloudinary** (CDN with automatic format/quality optimization) — there is **no Supabase Storage fallback** and no image data in the database. The database stores only the resulting **public Cloudinary URL** in a `text` column.

- Files are resized/compressed **in the browser before upload** (max ~1600px by default, 8 MB per file) to keep uploads small, then uploaded to Cloudinary via an unsigned preset (`f_auto,q_auto` optimization embedded in the URL).
- Image fields: `site_content.logo_url` (header/footer/login logo), `site_content.hero_image` (hero background), `site_content.about_image` (About section photo), `cms_programs.image` (program cover photo), `cms_team.photo` (leadership photo), `cms_news.image` (news thumbnail), `cms_gallery.image` (gallery photos), `employees.photo` (passport photo).
- `scripts/diag-count.mjs` (`npm run diag:images`) reports how many rows still hold base64 / Supabase Storage / Cloudinary URLs — run it to confirm the database is Cloudinary-only.

#### ☁️ Cloudinary setup (required)

1. Create a Cloudinary account and note your **cloud name** (Account → Settings → Cloud name).
2. Create an **unsigned upload preset** (Settings → Upload → Upload presets → Add upload preset → set **Signing mode: Unsigned**) — this lets the browser upload directly without exposing your API secret.
3. Add to `.env` (see `.env.example`):
   ```
   VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
   VITE_CLOUDINARY_UPLOAD_PRESET=your-unsigned-preset
   ```
   Uploads fail with a clear error until both vars are set.

> Cloudinary URLs can't be deleted from the browser (unsigned presets have no delete permission) — clean up unused assets in the **Cloudinary Media Library** dashboard when needed.

#### 🛰 Monitoring & Analytics (optional)

Both are opt-in — the app runs fine without them:

- **Sentry error tracking** — set `VITE_SENTRY_DSN` (create a project at [sentry.io](https://sentry.io) → Settings → Projects → Client Keys). Captures uncaught exceptions, unhandled promise rejections, and `ErrorBoundary` failures. When the var is empty, no Sentry code is loaded.
- **Plausible analytics** — cookie-less, GDPR-friendly site analytics. Set `VITE_PLAUSIBLE_DOMAIN` to your registered Plausible domain and the script loads on the public site. Leave empty to disable.

#### 🧹 Purging legacy image values (one-time cleanup)

If any rows still hold base64 or Supabase Storage URLs (left over from before the Cloudinary migration), run [`supabase/purge_non_cloudinary_images.sql`](./supabase/purge_non_cloudinary_images.sql) in the Supabase SQL Editor — it clears every non-Cloudinary image value so only Cloudinary URLs (or NULL) remain.

## 🗄️ Database Schema

### EMS tables (Staff Portal register)

| Table | Columns | Notes |
|---|---|---|
| `employees` | `id` (uuid PK), `name`, `gender`, `grade`, `cadre`, `date_first_appt`, `date_present_appt`, `dob`, `phone`, `lga`, `psn`, `station`, `photo`, `remarks`, `created_at`, `updated_at` | Core staff register. `psn` is UNIQUE — the app rejects duplicate PSNs. `gender` powers the Dashboard distribution; `dob` + `date_first_appt` power the Retirement & Tenure view (age 60 / 35 years of service). |
| `stations` | `id` (uuid PK), `name`, `lga`, `type`, `created_at`, `updated_at` | Posting stations. Auto-seeded from `src/data/constants.ts` on first load if empty. |
| `cadres` | `id` (uuid PK), `name`, `grade`, `category`, `created_at`, `updated_at` | Staff cadres (AMEB establishment: Adult Education Officer ladder, directorate, admin & support) with each cadre's typical grade level. Auto-seeded from `src/data/constants.ts` on first load if empty; the employee form auto-fills the grade from the selected cadre. |
| `centres` | `id` (uuid PK), `name`, `lga`, `ward`, `community`, `type`, `status`, `capacity` (int), `phone`, `ngo_partner`, `remarks`, `created_at`, `updated_at` | Learning centres register. Facilitators are assigned separately via `centre_facilitators`. |
| `facilitators` | `id` (uuid PK), `name`, `gender`, `phone`, `lga`, `community`, `remarks`, `created_at`, `updated_at` | Facilitator registry (created by `setup_facilitators.sql`). |
| `centre_facilitators` | `centre_id` (FK → centres, cascade), `facilitator_id` (FK → facilitators, cascade), `created_at` — PK `(centre_id, facilitator_id)` | Many-to-many: a centre can have many facilitators, a facilitator can serve many centres. |
| `enrolment_stats` | `id` (uuid PK), `year` (int, UNIQUE), `learners_enrolled`, `certified`, `dropped_out`, `no_exam` (ints), `ngos` (text[]), `created_at`, `updated_at` | Per-year learner outcome figures managed from **CMS → Enrolment Stats** and shown live on the public site hero stats. |
| `public_centres` (view) | Safe projection of `centres` + facilitator names — public fields only, never `remarks`. Powers the public "Find a Learning Center" directory. |
| `audit_log` | `id` (uuid PK), `user_id`, `user_email`, `user_role`, `action`, `table_name`, `row_id`, `details` (jsonb), `created_at` | Append-only accountability trail: every admin/editor write is recorded with the signed-in user. **Insert** by any signed-in user; **select** by `super_admin` only (no update/delete policies, so the log can't be tampered with). Viewed from **Settings → Audit Log**. |

### CMS tables (public website)

| Table | Columns | Notes |
|---|---|---|
| `site_content` | `id` (uuid PK), `hero_badge`, `hero_title_1`, `hero_title_2`, `hero_title_sub`, `hero_desc`, `about_tag`, `about_title`, `about_sub`, `vision_text`, `mission_text`, `about_body`, `address`, `phone`, `phone_2`, `email`, `email_2`, `hours`, `hours_sat`, `programs_tag`, `programs_title`, `programs_sub`, `news_tag`, `news_title`, `news_sub`, `gallery_tag`, `gallery_title`, `gallery_sub`, `downloads_tag`, `downloads_title`, `downloads_sub`, `contact_tag`, `contact_title`, `contact_sub`, `logo_url`, `hero_image`, `about_image`, `created_at`, `updated_at` | Singleton row with fixed id `00000000-0000-0000-0000-000000000001`. **Seeded with default content by `setup.sql`** — required for the Site Content editor to load. Image columns are optional (uploaded via the CMS “Logo & Photos” card). |
| `cms_programs` | `id` (uuid PK), `title`, `icon`, `description`, `sort_order`, `created_at`, `updated_at` | Education programs shown on the Landing page. |
| `cms_news` | `id` (uuid PK), `title`, `excerpt`, `date`, `icon`, `image` (URL, optional), `sort_order`, `created_at`, `updated_at` | News & announcements. `image` replaces the icon banner when set. |
| `cms_team` | `id` (uuid PK), `name`, `initials`, `role`, `photo` (URL, optional), `sort_order`, `created_at`, `updated_at` | Board leadership. `photo` replaces the initials avatar when set. |
| `cms_gallery` | `id` (uuid PK), `label`, `image` (URL, optional), `wide` (bool), `tall` (bool), `sort_order`, `created_at`, `updated_at` | Photo gallery items. `image` holds the Cloudinary URL. |
| `cms_downloads` | `id` (uuid PK), `title`, `meta`, `icon`, `sort_order`, `created_at`, `updated_at` | Downloadable resources. |
| `cms_contacts` | `id` (uuid PK), `name`, `email`, `subject`, `message`, `read` (bool), `created_at` | Contact form inbox. Written by the public Landing page. |

> ℹ️ On the CMS tables, `updated_at` is informational only — the app does not maintain it when content is edited (unlike the EMS tables, which set it on save).

> ⚠️ **Access:** RLS is disabled on all tables because the app uses the Supabase anon key directly (the public Landing page reads CMS data without login). The `employees` table holds sensitive staff data — if you want to protect it, enable RLS with policies restricted to `authenticated` users (see the security notes at the bottom of `supabase/setup_ems.sql`).

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
