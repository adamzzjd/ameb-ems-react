import { Button } from '../ui/button';
import { PAGE_TITLES } from '../../data/constants';
import { useTheme } from '../../hooks/useTheme';
import type { AppPage } from '../../types';

interface TopbarProps {
  currentPage: AppPage | string;
  onToggleSidebar: () => void;
  onPrint?: () => void;
  onAdd?: () => void;
}

export function Topbar({ currentPage, onToggleSidebar, onPrint, onAdd }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const info = PAGE_TITLES[currentPage as AppPage] || { title: '', subtitle: '' };

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/80 backdrop-blur-xl flex items-center gap-3 px-6 shrink-0">
      <button
        onClick={onToggleSidebar}
        className="hamburger-btn inline-flex items-center justify-center text-foreground p-1 shrink-0 bg-transparent border-none cursor-pointer"
        aria-label="Toggle sidebar"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-bold text-foreground inline">
          {info.title}
          <span className="text-xs text-muted-foreground font-normal ml-1.5">
            {info.subtitle}
          </span>
        </h1>
      </div>
      <div className="flex gap-2 shrink-0">
        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg border border-border bg-transparent flex items-center justify-center text-sm cursor-pointer hover:bg-accent transition-colors"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {onPrint && (
          <Button variant="outline" size="sm" onClick={onPrint}>
            🖨 Print
          </Button>
        )}
        {onAdd && (
          <Button variant="gold" size="sm" onClick={onAdd}>
            + Add Employee
          </Button>
        )}
      </div>
    </header>
  );
}
