import type { AppPage, PageTitle } from '../types';

export const LGAs = [
  'Demsa', 'Fufore', 'Ganye', 'Girei', 'Gombi', 'Guyuk', 'Hong', 'Jada',
  'Lamurde', 'Madagali', 'Maiha', 'Mayo-Belwa', 'Michika', 'Mubi North',
  'Mubi South', 'Numan', 'Shelleng', 'Song', 'Toungo', 'Yola North', 'Yola South',
] as const;

export const CADRES = [
  'Executive Secretary',
  'Director, Literacy Education',
  'Director, Planning, Research and Statistics',
  'Director, Home Economics',
  'Director, Finance',
  'Director, Continuing Education',
  'Adult Education Officer II',
  'Asst. Adult Education Officer',
  'Senior Education Officer',
  'Education Officer',
  'Administrative Officer',
  'Accountant II',
  'Store Officer',
  'Information Officer II',
  'Executive Officer (Acct)',
  'Procurement Officer II',
  'Clerical Officer',
  'Driver',
  'Messenger',
  'Other',
] as const;

export const GRADES = [
  'GL 01', 'GL 02', 'GL 03', 'GL 04', 'GL 05', 'GL 06',
  'GL 07', 'GL 07/1', 'GL 08', 'GL 08/2', 'GL 09', 'GL 10',
  'GL 12', 'GL 13', 'GL 14', 'GL 15', 'GL 15/9',
  'GL 16', 'GL 16/9', 'GL 17', 'GL 17/9',
] as const;

export const STATIONS = [
  'Yola (HQ)', 'Mubi', 'Ganye', 'Numan', 'Hong', 'Michika', 'Gombi',
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
  stations:      { title: 'Manage Stations',         subtitle: 'Add, edit and delete posting stations' },
  cadres:        { title: 'Manage Cadres',           subtitle: 'Add, edit and delete staff cadres' },
  centres:       { title: 'Learning Centres Register', subtitle: 'All AMEB learning centres across 21 LGAs' },
  'cms-dashboard': { title: '📝 Content Manager',      subtitle: 'Manage all website content' },
  'cms-content':  { title: '⚙️ Site Content',          subtitle: 'Hero, About, Mission, Vision, Contact' },
  'cms-programs': { title: '📚 Programs',              subtitle: 'Manage education programs' },
  'cms-news':     { title: '📰 News & Announcements',  subtitle: 'Manage news articles' },
  'cms-team':     { title: '👥 Team / Leadership',     subtitle: 'Manage leadership team' },
  'cms-gallery':  { title: '🖼 Gallery',               subtitle: 'Manage photo gallery' },
  'cms-downloads':{ title: '📥 Downloads',             subtitle: 'Manage downloadable resources' },
  'cms-inbox':    { title: '✉️ Contact Inbox',         subtitle: 'View contact form messages' },
  users:          { title: '👤 User Management',       subtitle: 'Create users and assign roles' },
};
