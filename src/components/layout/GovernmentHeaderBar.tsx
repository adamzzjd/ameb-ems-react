/* Restyled from scratch - Adamawa State Mass Education Board
   Official Government Website */

import { cn } from '@/lib/utils';

interface GovernmentHeaderBarProps {
  className?: string;
}

export function GovernmentHeaderBar({ className }: GovernmentHeaderBarProps) {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Lagos',
  });
  const dateString = now.toLocaleDateString('en-NG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Africa/Lagos',
  });

  return (
    <div
      className={cn(
        'w-full bg-primary-dark text-text-inverse',
        'text-[11px] font-medium tracking-wide',
        'py-1.5 px-4',
        'flex items-center justify-between',
        'border-b border-white/10',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline">Federal Republic of Nigeria</span>
        <span className="hidden sm:inline opacity-40">|</span>
        <span>Adamawa State Government</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden md:inline opacity-70">{dateString}</span>
        <span className="hidden lg:inline opacity-70">{timeString} WAT</span>
        <button
          className="inline-flex items-center justify-center w-5 h-5 rounded opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Accessibility options"
          title="Accessibility"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="8" r="2" />
            <path d="M12 14v4" />
            <path d="M8 18l4-4 4 4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
