/* Restyled from scratch - Adamawa State Mass Education Board
   Official Government Website */

import { Button } from '../ui/button';
import { ThemeToggle } from '../ui/ThemeToggle';
import { PAGE_TITLES } from '../../data/constants';
import { Bell } from 'lucide-react';
import type { AppPage } from '../../types';

interface TopbarProps {
  currentPage: AppPage | string;
  onToggleSidebar: () => void;
  onPrint?: () => void;
  onAdd?: () => void;
}

export function Topbar({ currentPage, onToggleSidebar, onPrint, onAdd }: TopbarProps) {
  const info = PAGE_TITLES[currentPage as AppPage] || { title: '', subtitle: '' };

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/80 backdrop-blur-xl flex items-center gap-3 px-4 md:px-6 shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={onToggleSidebar}
        className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-foreground bg-transparent border border-border hover:bg-accent transition-colors"
        aria-label="Toggle sidebar"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-bold text-foreground inline font-heading">
          {info.title}
          <span className="text-xs text-muted-foreground font-body font-normal ml-1.5">
            {info.subtitle}
          </span>
        </h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Notifications */}
        <button
          className="relative w-9 h-9 rounded-lg border border-border bg-transparent flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gold text-[9px] font-bold text-primary-dark flex items-center justify-center">
            3
          </span>
        </button>

        {/* Theme toggle */}
        <ThemeToggle compact />

        {onPrint && (
          <Button variant="outline" size="sm" onClick={onPrint} className="hidden sm:inline-flex">
            Print
          </Button>
        )}
        {onAdd && (
          <Button variant="default" size="sm" onClick={onAdd}>
            + Add Employee
          </Button>
        )}
      </div>
    </header>
  );
}
