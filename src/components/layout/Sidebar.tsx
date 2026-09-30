/* Restyled from scratch - Adamawa State Mass Education Board
   Official Government Website */

import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '@/supabase/client';
import { ThemeToggle } from '../ui/ThemeToggle';
import { cn } from '@/lib/utils';
import { ROLE_LABELS, type Permission } from '@/lib/roles';
import {
  LayoutDashboard, Users, MapPin, BarChart3,
  GraduationCap, BookOpen, Building2, Settings, FileText,
  Download, Printer, Plus, LogOut, UserCog, UsersRound, Save,
  Newspaper, Image, MessageSquare, CalendarClock, SearchCheck, TrendingUp, CalendarDays,
  MapPinned,
  UserPlus,
  Handshake,
  CalendarRange,
  ClipboardList, Send, Inbox,
  Network, Landmark,
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onAddEmployee: () => void;
  onImportCsv: () => void;
  onExportCsv: () => void;
  onPrint: () => void;
  onBackup?: () => void;
  onLogout: () => void;
  employeeCount: number;
  unreadContactCount?: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavItem {
  page: string;
  icon: React.ReactNode;
  label: string;
  badge?: boolean;
  permission?: Permission;
}

interface NavSection {
  label: string;
  items: NavItem[];
  permission?: Permission;
}

const navSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { page: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
      { page: 'explore', icon: <Network size={18} />, label: 'Explore' },
      { page: 'account', icon: <UserCog size={18} />, label: 'My Account' },
    ],
  },
  {
    label: 'Board',
    items: [
      { page: 'employees', icon: <Users size={18} />, label: 'Staff Register', badge: true },
      { page: 'departments', icon: <Landmark size={18} />, label: 'Departments', permission: 'settings.manage' },
      { page: 'retirement', icon: <CalendarClock size={18} />, label: 'Retirement & Tenure' },
      { page: 'promotions', icon: <TrendingUp size={18} />, label: 'Promotions & Progression' },
      { page: 'leaves', icon: <CalendarDays size={18} />, label: 'Leave Management' },
      { page: 'psn-check', icon: <UserPlus size={18} />, label: 'PSN Tools', permission: 'employees.import' },
      { page: 'data-quality', icon: <SearchCheck size={18} />, label: 'Data Quality' },
      { page: 'lga-officers', icon: <MapPinned size={18} />, label: 'LGA Area Officers', permission: 'settings.manage' },
    ],
  },
  {
    label: 'Partners',
    items: [
      { page: 'partners', icon: <Handshake size={18} />, label: 'Organisations', permission: 'partners.manage' },
      { page: 'partner-home', icon: <Landmark size={18} />, label: 'Partner Portals', permission: 'centres.manage' },
      { page: 'programmes', icon: <BookOpen size={18} />, label: 'Programmes', permission: 'reports.view' },
      { page: 'cohorts', icon: <CalendarRange size={18} />, label: 'Cohorts', permission: 'reports.view' },
      { page: 'learners', icon: <GraduationCap size={18} />, label: 'Learner Register', permission: 'reports.view' },
      { page: 'centres', icon: <MapPin size={18} />, label: 'Learning Centres', permission: 'centres.manage' },
      { page: 'facilitators', icon: <UsersRound size={18} />, label: 'Facilitators', permission: 'settings.manage' },
      { page: 'reports', icon: <BarChart3 size={18} />, label: 'Reports & M&E', permission: 'reports.view' },
    ],
  },
  {
    label: 'Data Collection',
    items: [
      { page: 'form-builder', icon: <ClipboardList size={18} />, label: 'Form Builder', permission: 'forms.manage' },
      { page: 'my-assignments', icon: <Send size={18} />, label: 'My Assignments', permission: 'forms.submit' },
      { page: 'submissions-review', icon: <Inbox size={18} />, label: 'Submissions Review', permission: 'reports.view' },
    ],
  },
  {
    label: 'Settings',
    permission: 'settings.manage',
    items: [
      { page: 'stations', icon: <Building2 size={18} />, label: 'Manage Stations' },
      { page: 'cadres', icon: <BookOpen size={18} />, label: 'Manage Cadres' },
      { page: 'users', icon: <UserCog size={18} />, label: 'User Management', permission: 'users.manage' },
      { page: 'audit-log', icon: <FileText size={18} />, label: 'Audit Log', permission: 'audit.view' },
    ],
  },

  {
    label: 'Content Manager',
    permission: 'cms.edit',
    items: [
      { page: 'cms-dashboard', icon: <FileText size={18} />, label: 'CMS Dashboard' },
      { page: 'cms-content', icon: <Settings size={18} />, label: 'Site Content' },
      { page: 'cms-programs', icon: <BookOpen size={18} />, label: 'Programs' },
      { page: 'cms-news', icon: <Newspaper size={18} />, label: 'News' },
      { page: 'cms-team', icon: <Users size={18} />, label: 'Team' },
      { page: 'cms-gallery', icon: <Image size={18} />, label: 'Gallery' },
      { page: 'cms-downloads', icon: <Download size={18} />, label: 'Downloads' },
      { page: 'cms-inbox', icon: <MessageSquare size={18} />, label: 'Contact Inbox' },
      { page: 'cms-enrolments', icon: <BarChart3 size={18} />, label: 'Enrolment Stats' },
    ],
  },
];

const actions: { icon: React.ReactNode; label: string; key: string; permission: Permission }[] = [
  { icon: <Plus size={18} />, label: 'Add Employee', key: 'add', permission: 'employees.create' },
  { icon: <Download size={18} />, label: 'Import from Register', key: 'import', permission: 'employees.import' },
  { icon: <Download size={18} />, label: 'Export to CSV', key: 'export', permission: 'employees.export' },
  { icon: <Printer size={18} />, label: 'Print Full Register', key: 'print', permission: 'employees.view' },
  { icon: <Save size={18} />, label: 'Backup Register', key: 'backup', permission: 'settings.manage' },
];

export function Sidebar({
  currentPage, onNavigate, onAddEmployee, onImportCsv, onExportCsv,
  onPrint, onBackup, onLogout, employeeCount, unreadContactCount = 0,
  mobileOpen, onMobileClose,
}: SidebarProps) {
  const { user, role, can } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  // Partner users get their own slim world (Phase 29): their org portal, the
  // drill-down navigator, and field data collection. Board sections are hidden.
  const isPartner = role !== null && ['partner_admin', 'partner_editor', 'partner_viewer'].includes(role);

  // Show the board's actual logo (from CMS) in the sidebar when one is set.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.from('site_content').select('logo_url').single();
        if (!cancelled && data?.logo_url) setLogoUrl(data.logo_url);
      } catch { /* keep the icon fallback */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const visibleSections = navSections
    .filter(s => !s.permission || can(s.permission))
    .filter(s => !isPartner || s.label === 'Overview' || s.label === 'Data Collection')
    .map(s =>
      isPartner
        ? { ...s, items: s.items.filter(i => ['explore', 'account', 'my-assignments'].includes(i.page)) }
        : s,
    )
    .filter(s => s.items.length > 0);
  const visibleActions = actions.filter(a => can(a.permission));

  const handleNav = (page: string) => {
    onNavigate(page);
    if (onMobileClose) onMobileClose();
  };

  const handleAction = (key: string) => {
    switch (key) {
      case 'add': onAddEmployee(); break;
      case 'import': onImportCsv(); break;
      case 'export': onExportCsv(); break;
      case 'print': onPrint(); break;
      case 'backup': onBackup?.(); break;
    }
    if (onMobileClose) onMobileClose();
  };

  const sidebarContent = (
    <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col h-full overflow-hidden">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border shrink-0">
        {logoUrl ? (
          <div className="w-10 h-10 rounded-lg bg-sidebar-accent border border-sidebar-border flex items-center justify-center shrink-0 overflow-hidden">
            <img src={logoUrl} alt="AMEB logo" className="w-full h-full object-contain p-1" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg bg-gold flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-primary-dark" />
          </div>
        )}
        <div className="min-w-0">
          <div className="text-xs font-bold font-heading leading-tight text-sidebar-primary truncate">
            Adamawa MEB
          </div>
          <div className="text-[10px] text-sidebar-foreground/50 mt-0.5 truncate">
            Staff Portal
          </div>
        </div>
      </div>

      {/* Navigation sections */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2">
        {visibleSections.map((section) => (
          <div key={section.label} className="mb-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/40 px-4 pt-4 pb-2">
              {section.label}
            </div>
            {section.items.map((item) => {
              // Items can carry their own permission (e.g. User Management)
              if (item.permission && !can(item.permission)) return null;
              return (
                <button
                  key={item.page}
                  onClick={() => handleNav(item.page)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium w-[calc(100%-16px)] text-left transition-all duration-150 border-none cursor-pointer',
                    currentPage === item.page
                      ? 'bg-sidebar-accent text-sidebar-primary border-l-[3px] border-gold pl-[13px]'
                      : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                  )}
                >
                  <span className={cn(
                    'w-5 h-5 flex items-center justify-center shrink-0',
                    currentPage === item.page ? 'text-gold' : 'opacity-70'
                  )}>
                    {item.icon}
                  </span>
                  <span className="flex-1 min-w-0 truncate">{item.label}</span>
                  {item.page === 'cms-inbox' && unreadContactCount > 0 && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center text-white"
                      style={{ background: 'var(--color-error)' }}
                      title={`${unreadContactCount} unread message${unreadContactCount !== 1 ? 's' : ''}`}
                    >
                      {unreadContactCount > 99 ? '99+' : unreadContactCount}
                    </span>
                  )}
                  {item.badge && (
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center',
                      currentPage === item.page
                        ? 'bg-gold text-primary-dark'
                        : 'bg-sidebar-accent text-sidebar-foreground/70'
                    )}>
                      {employeeCount === 0 ? '—' : employeeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* Actions */}
        {visibleActions.length > 0 && (
          <>
            <div className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/40 px-4 pt-4 pb-2">
              Actions
            </div>
            {visibleActions.map((action) => (
              <button
                key={action.key}
                onClick={() => handleAction(action.key)}
                className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium w-[calc(100%-16px)] text-left transition-all duration-150 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent border-none cursor-pointer"
              >
                <span className="w-5 h-5 flex items-center justify-center shrink-0 opacity-70">
                  {action.icon}
                </span>
                {action.label}
              </button>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-primary">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-sidebar-foreground truncate">
              {user?.email || '—'}
            </div>
            <div className="text-[10px] text-sidebar-foreground/40">
              {role ? ROLE_LABELS[role] : 'Viewer'} · AMEB
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle compact className="h-8 w-8 border-sidebar-border hover:bg-sidebar-accent" />
          <button
            onClick={onLogout}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-sidebar-accent/50 border border-sidebar-border rounded-lg text-xs text-sidebar-foreground/60 cursor-pointer transition-all duration-150 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">{sidebarContent}</div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[99] md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile sidebar panel */}
      <div
        className={cn(
          'fixed left-0 top-0 bottom-0 z-[100] transition-all duration-300 md:hidden',
          mobileOpen ? 'left-0 shadow-xl' : '-left-[264px]'
        )}
      >
        {sidebarContent}
      </div>
    </>
  );
}
