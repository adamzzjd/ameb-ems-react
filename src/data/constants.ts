import type {
  AppPage,
  PageTitle,
  CentreOwnerType,
  ApprovalStatus,
  PartnerOrgType,
  OrgRole,
} from '../types';

export const LGAs = [
  'Demsa', 'Fufore', 'Ganye', 'Girei', 'Gombi', 'Guyuk', 'Hong', 'Jada',
  'Lamurde', 'Madagali', 'Maiha', 'Mayo-Belwa', 'Michika', 'Mubi North',
  'Mubi South', 'Numan', 'Shelleng', 'Song', 'Toungo', 'Yola North', 'Yola South',
] as const;

// ── Cadres ────────────────────────────────────────────────────────────────────
// Actual AMEB (Adamawa State Mass Education Board) staff establishment, aligned
// with the NMEC/state mass education board cadre structure. Each cadre carries
// its typical grade level (GL) — the employee form auto-fills the grade
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

// The statutory 21 LGAs merged with any LGA value coming from a register (a
// renamed or legacy value, or a centre in a new area), so list views and
// coverage figures never silently drop a row. Used by the Landing directory,
// the Dashboard coverage panel and the LGA Area Officers register.
export function mergeLgas(values: readonly (string | null | undefined)[]): string[] {
  return Array.from(new Set<string>([...LGAs, ...values.filter((v): v is string => !!v)]));
}

// ── Centre ownership ──────────────────────────────────────────────────────────
// Who owns/operates a learning centre. ADSMEB centres are the board's own;
// NGO / LGA / community centres belong to an external partner organisation.
export const OWNER_TYPES: readonly CentreOwnerType[] = [
  'ADSMEB', 'NGO', 'LGA', 'COMMUNITY', 'PRIVATE',
];

export const OWNER_TYPE_LABELS: Record<CentreOwnerType, string> = {
  ADSMEB: 'ADSMEB (Board)',
  NGO: 'NGO / Partner',
  LGA: 'Local Government',
  COMMUNITY: 'Community',
  PRIVATE: 'Private',
};

export const APPROVAL_STATUSES: readonly ApprovalStatus[] = ['pending', 'approved', 'rejected'];

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
};

// ── Partner organisations ─────────────────────────────────────────────────────
export const PARTNER_ORG_TYPES: readonly PartnerOrgType[] = [
  'NGO', 'INGO', 'LGA', 'CSO', 'FAITH', 'GOVT_AGENCY', 'PRIVATE',
];

export const PARTNER_ORG_TYPE_LABELS: Record<PartnerOrgType, string> = {
  NGO: 'NGO (local)',
  INGO: 'INGO (international)',
  LGA: 'Local Government Area',
  CSO: 'Civil Society Organisation',
  FAITH: 'Faith-based Organisation',
  GOVT_AGENCY: 'Government Agency',
  PRIVATE: 'Private Provider',
};

export const ORG_ROLES: readonly OrgRole[] = ['org_admin', 'org_editor', 'org_viewer'];

export const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  org_admin: 'Organisation Admin',
  org_editor: 'Organisation Editor',
  org_viewer: 'Organisation Viewer',
};

export const STATIONS = [
  'Yola (HQ)', 'Women Development Centre Malamre', 'Technical College Yola',
  'Mubi', 'Ganye', 'Numan', 'Hong', 'Michika', 'Gombi',
  'Song', 'Girei', 'Fufore', 'Demsa', 'Shelleng', 'Lamurde', 'Guyuk',
  'Jada', 'Mayo-Belwa', 'Madagali', 'Maiha', 'Toungo',
  'Yola North Office', 'Yola South Office', 'Other',
] as const;

export const PAGE_TITLES: Record<AppPage, PageTitle> = {
  dashboard:     { title: 'Dashboard',              subtitle: 'Overview' },
  explore:       { title: '🕸 Explore',               subtitle: 'The Board and its partners, nested: orgs → programmes → LGAs → centres → learners' },
  employees:     { title: 'All Employees',           subtitle: 'Permanent & Pensionable Officers' },
  retirement:    { title: '🎓 Retirement & Tenure',   subtitle: 'Age 60 / 35 years of service projections' },
  promotions:    { title: '📈 Promotions & Progression', subtitle: 'Due/overdue officers & promotion history' },
  leaves:        { title: '🗓 Leave Management',         subtitle: 'Requests, approvals & annual balances' },
  'psn-check':    { title: '🗂 PSN Tools',               subtitle: 'Check PSNs, register new officers & unlock self-service updates' },
  'data-quality': { title: '🔍 Data Quality',          subtitle: 'Missing fields & duplicate names' },
  stations:      { title: 'Manage Stations',         subtitle: 'Add, edit and delete posting stations' },
  departments:   { title: '🏛 Departments',            subtitle: "The Board's units — staff, assets and correspondence live here" },
  cadres:        { title: 'Manage Cadres',           subtitle: 'Add, edit and delete staff cadres' },
  facilitators:  { title: 'Manage Facilitators',     subtitle: 'Facilitator registry — assign to learning centres' },
  'lga-officers':{ title: 'LGA Area Officers',       subtitle: 'One area officer per local government — assigned from staff' },
  partners:      { title: '🤝 Partner Organisations', subtitle: 'NGOs, LGAs and CSOs that own and run learning centres' },
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
  programmes:     { title: '📚 Programmes',            subtitle: 'Courses delivered at learning centres' },
  cohorts:        { title: '🗓 Cohorts',                subtitle: 'Programme deliveries at centres' },
  learners:       { title: '🎓 Learner Register',       subtitle: 'People enrolled in cohorts — not staff' },
  reports:        { title: '📊 Reports & M&E',          subtitle: 'Delivery outcomes across programmes and LGAs' },
  'partner-home': { title: '🤝 Organisation Portal',    subtitle: 'The organisation\u2019s own world: LGAs → centres → learners → facilitators' },
  'form-builder': { title: '📋 Form Builder',           subtitle: 'Design data-collection forms and assign them' },
  'my-assignments': { title: '📝 My Assignments',        subtitle: 'Fill your assigned forms in the field' },
  'submissions-review': { title: '📥 Submissions Review',  subtitle: 'Approve, reject and export field data' },
};
