// ── Employee Types ────────────────────────────────────────────────────────────
export interface Employee {
  id: string;
  name: string;
  grade: string | null;
  cadre: string | null;
  date_first_appt: string | null;
  date_present_appt: string | null;
  dob: string | null;
  phone: string | null;
  lga: string | null;
  psn: string | null;
  station: string | null;
  photo: string | null;
  remarks: string;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeFormData {
  name: string;
  grade: string;
  cadre: string;
  date_first_appt: string;
  date_present_appt: string;
  dob: string;
  phone: string;
  lga: string;
  psn: string;
  station: string;
  photo: string;
  remarks: string;
}

// ── CMS Types ──────────────────────────────────────────────────────────────────
export interface CmsProgram {
  id: string;
  title: string;
  icon: string;
  description: string;
  details?: string;
  sort_order: number;
}

export interface CmsNews {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  icon: string;
  image?: string;
  body?: string;
  sort_order: number;
}

export interface CmsTeam {
  id: string;
  name: string;
  initials: string;
  role: string;
  photo?: string;
  sort_order: number;
}

export interface CmsGallery {
  id: string;
  label: string;
  image?: string;
  wide?: boolean;
  tall?: boolean;
  sort_order: number;
}

export interface CmsDownload {
  id: string;
  title: string;
  meta: string;
  icon: string;
  sort_order: number;
}

export interface CmsContact {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface SiteContent {
  id?: string;
  hero_badge: string;
  hero_title_1: string;
  hero_title_2: string;
  hero_title_sub: string;
  hero_desc: string;
  about_tag: string;
  about_title: string;
  about_sub: string;
  vision_text: string;
  mission_text: string;
  about_body: string;
  address: string;
  phone: string;
  phone_2: string;
  email: string;
  email_2: string;
  hours: string;
  hours_sat: string;
  programs_tag: string;
  programs_title: string;
  programs_sub: string;
  news_tag: string;
  news_title: string;
  news_sub: string;
  gallery_tag: string;
  gallery_title: string;
  gallery_sub: string;
  downloads_tag: string;
  downloads_title: string;
  downloads_sub: string;
  contact_tag: string;
  contact_title: string;
  contact_sub: string;
  logo_url?: string;
  hero_image?: string;
  about_image?: string;
}

export interface CmsData {
  site_content: SiteContent;
  programs: CmsProgram[];
  news: CmsNews[];
  team: CmsTeam[];
  gallery: CmsGallery[];
  downloads: CmsDownload[];
  contacts: CmsContact[];
}

// ── Station / Cadre / Centre Types ────────────────────────────────────────────
export interface Station {
  id: string;
  name: string;
  lga: string;
  type: string;
  created_at?: string;
  updated_at?: string;
}

export interface Cadre {
  id: string;
  name: string;
  category: string;
  created_at?: string;
  updated_at?: string;
}

export interface Centre {
  id: string;
  name: string;
  lga: string;
  ward: string;
  community: string;
  type: string;
  status: string;
  capacity: number | null;
  phone: string;
  facilitator: string;
  ngo_partner: string;
  remarks: string;
  created_at?: string;
  updated_at?: string;
}

// ── Filter State ───────────────────────────────────────────────────────────────
export interface FilterState {
  search: string;
  lga: string;
  station: string;
  grade: string;
  sortField: keyof Employee;
  sortDir: 1 | -1;
  page: number;
}

// ── Auth Types ─────────────────────────────────────────────────────────────────
export interface AuthState {
  user: import('@supabase/supabase-js').User | null;
  loading: boolean;
  session: import('@supabase/supabase-js').Session | null;
}

// ── Navigation ──────────────────────────────────────────────────────────────────
export interface PageTitle {
  title: string;
  subtitle: string;
}

export type AppPage =
  | 'dashboard'
  | 'employees'
  | 'station'
  | 'lga'
  | 'grade'
  | 'appointment'
  | 'stations'
  | 'cadres'
  | 'centres'
  | 'cms-dashboard'
  | 'cms-content'
  | 'cms-programs'
  | 'cms-news'
  | 'cms-team'
  | 'cms-gallery'
  | 'cms-downloads'
  | 'cms-inbox';
