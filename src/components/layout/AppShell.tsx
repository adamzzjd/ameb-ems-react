import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '../../hooks/useAuth';

interface AppShellProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onAddEmployee: () => void;
  onImportCsv?: () => void;
  onExportCsv?: () => void;
  onPrint?: () => void;
  employeeCount: number;
}

export function AppShell({
  children, currentPage, onNavigate, onAddEmployee,
  onImportCsv, onExportCsv, onPrint, employeeCount,
}: AppShellProps) {
  const { signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    window.location.reload();
  };

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        onAddEmployee={onAddEmployee}
        onImportCsv={onImportCsv || (() => {})}
        onExportCsv={onExportCsv || (() => {})}
        onPrint={onPrint || (() => {})}
        onLogout={handleLogout}
        employeeCount={employeeCount}
        mobileOpen={sidebarOpen}
        onMobileClose={closeSidebar}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar
          currentPage={currentPage}
          onToggleSidebar={toggleSidebar}
          onPrint={onPrint}
          onAdd={onAddEmployee}
        />
        <div className="flex-1 overflow-y-auto p-5 bg-background">
          {children}
        </div>
      </div>
    </div>
  );
}
