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
3. [`supabase/setup_storage.sql`](./supabase/setup_storage.sql) — **image uploads** (creates the public `images` Storage bucket and adds the image columns to the CMS tables)

All scripts are idempotent (safe to re-run).

### 🖼 How image uploads work

Images are uploaded through the CMS/forms to **Supabase Storage** (public `images` bucket) and the database stores the resulting **public URL** in a `text` column — the files themselves never live in the database.

- Files are resized/compressed **in the browser before upload** (max ~1600px by default, 8 MB per file) to keep storage small.
- The **gallery** (`cms_gallery.image`) and **employee photos** (`employees.photo`) currently store base64 data from older uploads — those keep working unchanged. Only new uploads use Storage URLs, and both render fine.
- Existing image fields: `site_content.logo_url` (header/footer/login logo), `site_content.hero_image` (hero background), `site_content.about_image` (About section photo), `cms_team.photo` (leadership photo), `cms_news.image` (news thumbnail).

## 🗄️ Database Schema

### EMS tables (Staff Portal register)

| Table | Columns | Notes |
|---|---|---|
| `employees` | `id` (uuid PK), `name`, `grade`, `cadre`, `date_first_appt`, `date_present_appt`, `dob`, `phone`, `lga`, `psn`, `station`, `photo`, `remarks`, `created_at`, `updated_at` | Core staff register. `psn` is UNIQUE — the app rejects duplicate PSNs. |
| `stations` | `id` (uuid PK), `name`, `lga`, `type`, `created_at`, `updated_at` | Posting stations. Auto-seeded from `src/data/constants.ts` on first load if empty. |
| `cadres` | `id` (uuid PK), `name`, `category`, `created_at`, `updated_at` | Staff cadres. Auto-seeded from `src/data/constants.ts` on first load if empty. |
| `centres` | `id` (uuid PK), `name`, `lga`, `ward`, `community`, `type`, `status`, `capacity` (int), `phone`, `facilitator`, `ngo_partner`, `remarks`, `created_at`, `updated_at` | Learning centres register. |

### CMS tables (public website)

| Table | Columns | Notes |
|---|---|---|
| `site_content` | `id` (uuid PK), `hero_badge`, `hero_title_1`, `hero_title_2`, `hero_title_sub`, `hero_desc`, `about_tag`, `about_title`, `about_sub`, `vision_text`, `mission_text`, `about_body`, `address`, `phone`, `phone_2`, `email`, `email_2`, `hours`, `hours_sat`, `programs_tag`, `programs_title`, `programs_sub`, `news_tag`, `news_title`, `news_sub`, `gallery_tag`, `gallery_title`, `gallery_sub`, `downloads_tag`, `downloads_title`, `downloads_sub`, `contact_tag`, `contact_title`, `contact_sub`, `logo_url`, `hero_image`, `about_image`, `created_at`, `updated_at` | Singleton row with fixed id `00000000-0000-0000-0000-000000000001`. **Seeded with default content by `setup.sql`** — required for the Site Content editor to load. Image columns are optional (uploaded via the CMS “Logo & Photos” card). |
| `cms_programs` | `id` (uuid PK), `title`, `icon`, `description`, `sort_order`, `created_at`, `updated_at` | Education programs shown on the Landing page. |
| `cms_news` | `id` (uuid PK), `title`, `excerpt`, `date`, `icon`, `image` (URL, optional), `sort_order`, `created_at`, `updated_at` | News & announcements. `image` replaces the icon banner when set. |
| `cms_team` | `id` (uuid PK), `name`, `initials`, `role`, `photo` (URL, optional), `sort_order`, `created_at`, `updated_at` | Board leadership. `photo` replaces the initials avatar when set. |
| `cms_gallery` | `id` (uuid PK), `label`, `image` (base64), `wide` (bool), `tall` (bool), `sort_order`, `created_at`, `updated_at` | Photo gallery items. |
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
