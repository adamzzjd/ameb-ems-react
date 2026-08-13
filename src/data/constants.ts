import type { AppPage, PageTitle } from '../types';

export const LGAs = [
  'Demsa', 'Fufore', 'Ganye', 'Girei', 'Gombi', 'Guyuk', 'Hong', 'Jada',
  'Lamurde', 'Madagali', 'Maiha', 'Mayo-Belwa', 'Michika', 'Mubi North',
  'Mubi South', 'Numan', 'Shelleng', 'Song', 'Toungo', 'Yola North', 'Yola South',
] as const;

// ── Cadres ────────────────────────────────────────────────────────────────────
// Actual AMEB (Adamawa State Mass Education Board) staff establishment, aligned
// with the NMEC/state mass education board cadre structure. Each cadre carries
// its typical salary grade level (GL) — the employee form auto-fills the grade
// from the selected cadre.
export interface CadreSeed {
  name: string;
  grade: string;
  category: string;
}

export const CADRES: CadreSeed[] = [
  // ── Senior Management / Directorate (GL 15–17) ────────────────────────────
  { name: 'Executive Secretary',                                  grade: 'GL 17', category: 'Senior Management' },
  { name: 'Director, Literacy Education',                         grade: 'GL 16', category: 'Senior Management' },
  { name: 'Director, Continuing Education',                       grade: 'GL 16', category: 'Senior Management' },
  { name: 'Director, Home Economics',                             grade: 'GL 16', category: 'Senior Management' },
  { name: 'Director, Planning, Research and Statistics',          grade: 'GL 16', category: 'Senior Management' },
  { name: 'Director, Finance',                                    grade: 'GL 16', category: 'Senior Management' },
  { name: 'Deputy Director',                                      grade: 'GL 15', category: 'Senior Management' },
  { name: 'Assistant Director',                                   grade: 'GL 15', category: 'Senior Management' },

  // ── Professional — Adult / Mass Education Officer ladder (GL 07–14) ──────
  { name: 'Chief Adult Education Officer',                        grade: 'GL 14', category: 'Professional' },
  { name: 'Assistant Chief Adult Education Officer',              grade: 'GL 13', category: 'Professional' },
  { name: 'Principal Adult Education Officer',                    grade: 'GL 12', category: 'Professional' },
  { name: 'Senior Adult Education Officer',                       grade: 'GL 10', category: 'Professional' },
  { name: 'Adult Education Officer I',                            grade: 'GL 09', category: 'Professional' },
  { name: 'Adult Education Officer II',                           grade: 'GL 08', category: 'Professional' },
  { name: 'Assistant Adult Education Officer',                    grade: 'GL 07', category: 'Professional' },
  { name: 'Information Officer II',                               grade: 'GL 08', category: 'Professional' },

  // ── Administrative & Finance (GL 07–09) ───────────────────────────────────
  { name: 'Administrative Officer',                               grade: 'GL 08', category: 'Administrative' },
  { name: 'Accountant II',                                        grade: 'GL 08', category: 'Administrative' },
  { name: 'Procurement Officer II',                               grade: 'GL 08', category: 'Administrative' },
  { name: 'Store Officer',                                        grade: 'GL 07', category: 'Administrative' },
  { name: 'Executive Officer (Acct)',                             grade: 'GL 07', category: 'Administrative' },

  // ── Support Staff (GL 02–07) ──────────────────────────────────────────────
  { name: 'Confidential Secretary',                               grade: 'GL 07', category: 'Support Staff' },
  { name: 'Clerical Officer',                                     grade: 'GL 04', category: 'Support Staff' },
  { name: 'Typist',                                               grade: 'GL 03', category: 'Support Staff' },
  { name: 'Driver',                                               grade: 'GL 03', category: 'Support Staff' },
  { name: 'Messenger',                                            grade: 'GL 02', category: 'Support Staff' },

  { name: 'Other', grade: '', category: 'Other' },
];

// Plain cadre names for dropdowns / lookups.
export const CADRE_NAMES = CADRES.map(c => c.name);

// Cadre name → default grade level (used to auto-fill the grade field).
export const CADRE_GRADES = Object.fromEntries(
  CADRES.filter(c => c.grade).map(c => [c.name, c.grade])
) as Record<string, string>;

export const GRADES = [
  'GL 01', 'GL 02', 'GL 03', 'GL 04', 'GL 05', 'GL 06',
  'GL 07', 'GL 07/1', 'GL 08', 'GL 08/2', 'GL 09', 'GL 10',
  'GL 12', 'GL 13', 'GL 14', 'GL 15', 'GL 15/9',
  'GL 16', 'GL 16/9', 'GL 17', 'GL 17/9',
] as const;

export const STATIONS = [
  'Yola (HQ)', 'Women Development Centre Malamre', 'Technical College Yola',
  'Mubi', 'Ganye', 'Numan', 'Hong', 'Michika', 'Gombi',
  'Song', 'Girei', 'Fufore', 'Demsa', 'Shelleng', 'Lamurde', 'Guyuk',
  'Jada', 'Mayo-Belwa', 'Madagali', 'Maiha', 'Toungo',
  'Yola North Office', 'Yola South Office', 'Other',
] as const;

export const PAGE_TITLES: Record<AppPage, PageTitle> = {
  dashboard:     { title: 'Dashboard',              subtitle: 'Overview' },
  employees:     { title: 'All Employees',           subtitle: 'Permanent & Pensionable Officers' },
  station:       { title: 'By Station',              subtitle: 'Staff grouped by present posting' },
  lga:           { title: 'By LGA of Origin',        subtitle: 'Staff grouped by local government' },
  grade:         { title: 'By Grade Level',          subtitle: 'Staff grouped by grade' },
  appointment:   { title: 'By Appointment Date',     subtitle: 'Staff sorted by date of first appointment' },
  retirement:    { title: '🎓 Retirement & Tenure',   subtitle: 'Age 60 / 35 years of service projections' },
  promotions:    { title: '📈 Promotions & Progression', subtitle: 'Due/overdue officers & promotion history' },
  leaves:        { title: '🗓 Leave Management',         subtitle: 'Requests, approvals & annual balances' },
  payroll:       { title: '💰 Payroll & Salary',         subtitle: 'Monthly payroll sheet (IPPS-ready)' },
  'update-requests': { title: '✍️ Update Requests',     subtitle: 'Officer self-service submissions awaiting review' },
  'psn-check':    { title: '🗂 Register by PSN',         subtitle: 'Check PSNs & register new officers' },
  'data-quality': { title: '🔍 Data Quality',          subtitle: 'Missing fields & duplicate names' },
  stations:      { title: 'Manage Stations',         subtitle: 'Add, edit and delete posting stations' },
  cadres:        { title: 'Manage Cadres',           subtitle: 'Add, edit and delete staff cadres' },
  facilitators:  { title: 'Manage Facilitators',     subtitle: 'Facilitator registry — assign to learning centres' },
  centres:       { title: 'Learning Centres Register', subtitle: 'All AMEB learning centres across 21 LGAs' },
  'cms-dashboard': { title: '📝 Content Manager',      subtitle: 'Manage all website content' },
  'cms-content':  { title: '⚙️ Site Content',          subtitle: 'Hero, About, Mission, Vision, Contact' },
  'cms-programs': { title: '📚 Programs',              subtitle: 'Manage education programs' },
  'cms-news':     { title: '📰 News & Announcements',  subtitle: 'Manage news articles' },
  'cms-team':     { title: '👥 Team / Leadership',     subtitle: 'Manage leadership team' },
  'cms-gallery':  { title: '🖼 Gallery',               subtitle: 'Manage photo gallery' },
  'cms-downloads':{ title: '📥 Downloads',             subtitle: 'Manage downloadable resources' },
  'cms-inbox':    { title: '✉️ Contact Inbox',         subtitle: 'View contact form messages' },
  'cms-enrolments': { title: '📈 Enrolment Statistics', subtitle: 'Per-year learner figures & NGO partners' },
  users:          { title: '👤 User Management',       subtitle: 'Create users and assign roles' },
  'audit-log':    { title: '🕵️ Audit Log',              subtitle: 'Who did what, when' },
  account:        { title: '👤 My Account',            subtitle: 'Profile & password' },
};
