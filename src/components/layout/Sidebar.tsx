import { useAuth } from '../../hooks/useAuth';
import { cn } from '@/lib/utils';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onAddEmployee: () => void;
  onImportCsv: () => void;
  onExportCsv: () => void;
  onPrint: () => void;
  onLogout: () => void;
  employeeCount: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavItem {
  page: string;
  icon: string;
  label: string;
  badge?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: 'Main Menu',
    items: [
      { page: 'dashboard', icon: '📊', label: 'Dashboard' },
      { page: 'employees', icon: '👥', label: 'All Employees', badge: true },
    ],
  },
  {
    label: 'Browse By',
    items: [
      { page: 'station', icon: '📍', label: 'Present Station' },
      { page: 'lga', icon: '🗺', label: 'LGA of Origin' },
      { page: 'grade', icon: '📋', label: 'Grade Level' },
      { page: 'appointment', icon: '📅', label: 'Appointment Date' },
      { page: 'centres', icon: '🏫', label: 'Learning Centres' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { page: 'stations', icon: '🏢', label: 'Manage Stations' },
      { page: 'cadres', icon: '🎓', label: 'Manage Cadres' },
    ],
  },
  {
    label: 'Content Manager',
    items: [
      { page: 'cms-dashboard', icon: '📝', label: 'CMS Dashboard' },
      { page: 'cms-content', icon: '⚙️', label: 'Site Content' },
      { page: 'cms-programs', icon: '📚', label: 'Programs' },
      { page: 'cms-news', icon: '📰', label: 'News' },
      { page: 'cms-team', icon: '👥', label: 'Team' },
      { page: 'cms-gallery', icon: '🖼', label: 'Gallery' },
      { page: 'cms-downloads', icon: '📥', label: 'Downloads' },
      { page: 'cms-inbox', icon: '✉️', label: 'Contact Inbox' },
    ],
  },
];

const actions = [
  { icon: '➕', label: 'Add Employee', key: 'add' },
  { icon: '📥', label: 'Import from Register', key: 'import' },
  { icon: '💾', label: 'Export to CSV', key: 'export' },
  { icon: '🖨', label: 'Print Full Register', key: 'print' },
];

export function Sidebar({
  currentPage, onNavigate, onAddEmployee, onImportCsv, onExportCsv,
  onPrint, onLogout, employeeCount, mobileOpen, onMobileClose,
}: SidebarProps) {
  const { user } = useAuth();

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
    }
    if (onMobileClose) onMobileClose();
  };

  const sidebarContent = (
    <aside className="w-60 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col h-full overflow-hidden overflow-y-auto scrollbar-thin">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-[18px] border-b border-sidebar-border shrink-0">
        <div className="w-[42px] h-[42px] rounded-md border-2 border-gold bg-navy-light flex items-center justify-center text-lg shrink-0">
          🏛
        </div>
        <div>
          <div className="text-[11px] font-bold leading-tight text-white">
            Adamawa State<br />Mass Education Board
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-sidebar-foreground/50 mt-0.5">
            <span className="w-[7px] h-[7px] rounded-full bg-green-500 inline-block" />
            Connected
          </div>
        </div>
      </div>

      {/* Nav sections */}
      {navSections.map(section => (
        <div key={section.label}>
          <div className="text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/40 px-4 pt-[18px] pb-1.5">
            {section.label}
          </div>
          {section.items.map(item => (
            <button
              key={item.page}
              onClick={() => handleNav(item.page)}
              className={cn(
                'flex items-center gap-2.5 px-3.5 py-[9px] mx-2 rounded-md text-sm font-medium w-[calc(100%-16px)] text-left transition-all duration-150 border-none cursor-pointer',
                currentPage === item.page
                  ? 'bg-gold/10 text-gold font-medium border-l-[3px] border-gold pl-[11px]'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <span className={cn(
                'text-[15px] w-[18px] text-center shrink-0',
                currentPage === item.page ? 'text-gold' : ''
              )}>
                {item.icon}
              </span>
              {item.label}
              {item.badge && (
                <span className={cn(
                  'ml-auto text-[10px] font-bold px-[7px] py-[1px] rounded-full',
                  currentPage === item.page
                    ? 'bg-gold text-navy'
                    : 'bg-sidebar-accent text-sidebar-foreground/50'
                )}>
                  {employeeCount === 0 ? '—' : employeeCount}
                </span>
              )}
            </button>
          ))}
        </div>
      ))}

      {/* Actions */}
      <div className="text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/40 px-4 pt-[18px] pb-1.5">
        Actions
      </div>
      {actions.map(action => (
        <button
          key={action.key}
          onClick={() => handleAction(action.key)}
          className="flex items-center gap-2.5 px-3.5 py-[9px] mx-2 rounded-md text-sm font-medium w-[calc(100%-16px)] text-left transition-all duration-150 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent border-none cursor-pointer"
        >
          <span className="text-[15px] w-[18px] text-center shrink-0">{action.icon}</span>
          {action.label}
        </button>
      ))}

      {/* Footer */}
      <div className="mt-auto px-4 py-3.5 border-t border-sidebar-border shrink-0">
        <div className="text-[11px] text-sidebar-foreground/35 leading-relaxed">
          <strong className="text-sidebar-foreground/55 text-xs">
            {user?.email || '—'}
          </strong>
          <br />EMIS Officer · AMEB
        </div>
        <button
          onClick={onLogout}
          className="mt-2 w-full py-[7px] bg-sidebar-accent/50 border border-sidebar-border rounded-md text-xs text-sidebar-foreground/40 cursor-pointer transition-all duration-150 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          Sign Out
        </button>
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
          className="fixed inset-0 bg-black/50 z-[99]"
          onClick={onMobileClose}
        />
      )}
      {/* Mobile sidebar panel */}
      <div
        className={cn(
          'fixed left-0 top-0 bottom-0 z-[100] transition-all duration-250 md:hidden',
          mobileOpen ? 'left-0 shadow-xl' : '-left-[260px]'
        )}
      >
        {sidebarContent}
      </div>
    </>
  );
}
