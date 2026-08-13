/* Restyled from scratch - Adamawa State Mass Education Board
   Official Government Website */

import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { GovernmentHeaderBar } from './GovernmentHeaderBar';
import { useAuth } from '../../hooks/useAuth';
import { useUnreadContacts } from '../../hooks/useUnreadContacts';

interface AppShellProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onAddEmployee: () => void;
  onImportCsv?: () => void;
  onExportCsv?: () => void;
  onPrint?: () => void;
  onBackup?: () => void;
  employeeCount: number;
  canAdd?: boolean;
}

export function AppShell({
  children, currentPage, onNavigate, onAddEmployee,
  onImportCsv, onExportCsv, onPrint, onBackup, employeeCount, canAdd,
}: AppShellProps) {
  const { signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { unread, refresh: refreshUnread } = useUnreadContacts();

  // Re-check the badge whenever the page changes (e.g. after reading/deleting
  // messages in the inbox) instead of waiting for the next poll tick.
  useEffect(() => { refreshUnread(); }, [currentPage, refreshUnread]);

  const handleLogout = async () => {
    await signOut();
    window.location.reload();
  };

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        onAddEmployee={onAddEmployee}
        onImportCsv={onImportCsv || (() => {})}
        onExportCsv={onExportCsv || (() => {})}
        onPrint={onPrint || (() => {})}
        onBackup={onBackup}
        onLogout={handleLogout}
        employeeCount={employeeCount}
        unreadContactCount={unread}
        mobileOpen={sidebarOpen}
        onMobileClose={closeSidebar}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <GovernmentHeaderBar />
        <Topbar
          currentPage={currentPage}
          onToggleSidebar={toggleSidebar}
          onPrint={onPrint}
          onAdd={canAdd ? onAddEmployee : undefined}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-5 lg:p-6 bg-background main-scroll">
          {children}
        </main>
      </div>
    </div>
  );
}
