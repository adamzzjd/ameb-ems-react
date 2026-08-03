-- ============================================================================
-- AMEB EMS — CMS Database Setup
-- ----------------------------------------------------------------------------
-- Creates all CMS tables used by the public website + CMS admin:
--   site_content  (singleton row — REQUIRED, page errors without it)
--   cms_programs, cms_news, cms_team, cms_gallery, cms_downloads
--   cms_contacts
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard
--   2. Go to "SQL Editor" → "New query"
--   3. Paste this entire file and click "Run"
--   4. (Safe to run multiple times — uses IF NOT EXISTS / ON CONFLICT)
--
-- NOTE: RLS is disabled on these tables because the app accesses them with
-- the anon key (public Landing page reads + contact form writes).
-- ============================================================================

-- ── Site Content (singleton) ────────────────────────────────────────────────
-- The app reads this table with .single() and upserts a fixed row id, so the
-- seed row below is REQUIRED for the "Site Content" editor to load.
create table if not exists public.site_content (
  id            uuid primary key,
  hero_badge    text not null default '',
  hero_title_1  text not null default '',
  hero_title_2  text not null default '',
  hero_title_sub text not null default '',
  hero_desc     text not null default '',
  about_tag     text not null default '',
  about_title   text not null default '',
  about_sub     text not null default '',
  vision_text   text not null default '',
  mission_text  text not null default '',
  about_body    text not null default '',
  address       text not null default '',
  phone         text not null default '',
  phone_2       text not null default '',
  email         text not null default '',
  email_2       text not null default '',
  hours         text not null default '',
  hours_sat     text not null default '',
  programs_tag  text not null default '',
  programs_title text not null default '',
  programs_sub  text not null default '',
  news_tag      text not null default '',
  news_title    text not null default '',
  news_sub      text not null default '',
  gallery_tag   text not null default '',
  gallery_title text not null default '',
  gallery_sub   text not null default '',
  downloads_tag text not null default '',
  downloads_title text not null default '',
  downloads_sub text not null default '',
  contact_tag   text not null default '',
  contact_title text not null default '',
  contact_sub   text not null default '',
  logo_url      text,                          -- logo image URL (optional)
  hero_image    text,                          -- hero background photo URL (optional)
  about_image   text,                          -- about section photo URL (optional)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Seed the singleton row with the app's default content
insert into public.site_content (id, hero_badge, hero_title_1, hero_title_2, hero_title_sub, hero_desc,
  about_tag, about_title, about_sub, vision_text, mission_text, about_body,
  address, phone, phone_2, email, email_2, hours, hours_sat,
  programs_tag, programs_title, programs_sub,
  news_tag, news_title, news_sub,
  gallery_tag, gallery_title, gallery_sub,
  downloads_tag, downloads_title, downloads_sub,
  contact_tag, contact_title, contact_sub)
values (
  '00000000-0000-0000-0000-000000000001',
  'Adamawa State Government — Ministry of Education',
  'Mass Education', 'for All', 'Adamawa State Mass Education Board',
  'Dedicated to providing quality literacy, vocational, and continuing education to every citizen across all 21 Local Government Areas of Adamawa State.',
  'About the Board', 'Our Mandate & Leadership',
  'A parastatal under the Adamawa State Ministry of Education, delivering mass education services since inception.',
  'A fully literate and skilled Adamawa State where every citizen has access to quality mass education.',
  'To provide accessible, equitable, and functional mass education services that transform lives and communities.',
  'We coordinate and deliver adult literacy, vocational training, home economics, nomadic education, and continuing education programmes across all 21 LGAs.',
  'Adamawa State Mass Education Board, Jimeta-Yola, Adamawa State, Nigeria',
  '+234 803 220 0011', '+234 803 320 0122',
  'info@ameb.adamawa.gov.ng', 'support@ameb.adamawa.gov.ng',
  'Monday — Friday: 8:00 AM — 4:00 PM', 'Saturday: 9:00 AM — 1:00 PM',
  'What We Offer', 'Our Programs',
  'Comprehensive mass education programs designed for all citizens of Adamawa State',
  'Latest Updates', 'News & Announcements',
  'Latest updates, circulars, and announcements from the Board',
  'Moments', 'Photo Gallery',
  'Moments from our programs, events, and learning centres across Adamawa State',
  'Resources', 'Downloads & Resources',
  'Important documents, forms, and publications for staff and the public',
  'Get in Touch', 'Contact Us',
  'Reach out to the Adamawa State Mass Education Board — we are here to serve'
)
on conflict (id) do nothing;

-- ── Programs ─────────────────────────────────────────────────────────────────
create table if not exists public.cms_programs (
  id          uuid primary key,
  title       text not null default '',
  icon        text not null default '',
  description text not null default '',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── News ─────────────────────────────────────────────────────────────────────
create table if not exists public.cms_news (
  id         uuid primary key,
  title      text not null default '',
  excerpt    text not null default '',
  date       text not null default '',
  icon       text not null default '',
  image      text,                          -- thumbnail image URL (optional)
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Team ─────────────────────────────────────────────────────────────────────
create table if not exists public.cms_team (
  id         uuid primary key,
  name       text not null default '',
  initials   text not null default '',
  role       text not null default '',
  photo      text,                          -- leadership photo URL (optional)
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Gallery ──────────────────────────────────────────────────────────────────
create table if not exists public.cms_gallery (
  id         uuid primary key,
  label      text not null default '',
  image      text,                          -- base64 image data (optional)
  wide       boolean not null default false,
  tall       boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Downloads ────────────────────────────────────────────────────────────────
create table if not exists public.cms_downloads (
  id         uuid primary key,
  title      text not null default '',
  meta       text not null default '',
  icon       text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Contact Inbox ────────────────────────────────────────────────────────────
create table if not exists public.cms_contacts (
  id         uuid primary key,
  name       text not null default '',
  email      text not null default '',
  subject    text not null default '',
  message    text not null default '',
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── Access ───────────────────────────────────────────────────────────────────
-- The app uses the Supabase anon key directly for all CMS reads/writes
-- (public Landing page + CMS admin). Disable RLS to match that design.
alter table public.site_content  disable row level security;
alter table public.cms_programs  disable row level security;
alter table public.cms_news      disable row level security;
alter table public.cms_team      disable row level security;
alter table public.cms_gallery   disable row level security;
alter table public.cms_downloads disable row level security;
alter table public.cms_contacts  disable row level security;
