/* Restyled from scratch - Adamawa State Mass Education Board
   Official Government Website */

import { useTheme } from '../../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  /** Compact mode: just the icon button, no pill */
  compact?: boolean;
}

export function ThemeToggle({ className, compact = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        className={cn(
          'inline-flex items-center justify-center w-10 h-10 rounded-lg',
          'border border-border bg-transparent text-foreground',
          'hover:bg-accent transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className
        )}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Light mode' : 'Dark mode'}
      >
        {isDark ? (
          <Sun className="h-[18px] w-[18px] text-gold" />
        ) : (
          <Moon className="h-[18px] w-[18px] text-primary-dark" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex items-center w-10 h-6 rounded-full',
        'transition-all duration-300 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isDark
          ? 'bg-primary-dark'
          : 'bg-gold',
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      role="switch"
      aria-checked={isDark}
    >
      {/* Sliding circle */}
      <span
        className={cn(
          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full',
          'flex items-center justify-center',
          'transition-transform duration-300 ease-in-out',
          'shadow-sm',
          isDark
            ? 'translate-x-4 bg-surface-warm'
            : 'translate-x-0 bg-white'
        )}
      >
        {isDark ? (
          <Moon className="h-3 w-3 text-primary" />
        ) : (
          <Sun className="h-3 w-3 text-gold" />
        )}
      </span>
    </button>
  );
}
